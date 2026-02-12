import { NextResponse } from "next/server";
import { withRoleAuth } from "@/lib/security";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  BusinessRuleError,
  validateAcademicYear,
  validateAndEnforceSingleCurrentAcademicYear,
  assertAcademicYearNotLocked,
} from "@/lib/business-rules";

/**
 * GET /api/academic-years
 * List all academic years for a school
 */
export async function GET(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const { searchParams } = new URL(req.url);
      const schoolId = searchParams.get("schoolId");

      if (!schoolId) {
        return NextResponse.json(
          { error: "schoolId is required" },
          { status: 400 }
        );
      }

      const academicYears = await prisma.academicYear.findMany({
        where: { schoolId },
        include: {
          terms: {
            orderBy: { startDate: "asc" },
          },
        },
        orderBy: { startDate: "desc" },
      });

      return NextResponse.json({ success: true, academicYears });
    } catch (error) {
      console.error("Error fetching academic years:", error);
      return NextResponse.json(
        { error: "Failed to fetch academic years" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin", "teacher"] as UserRole[])(request);
}

/**
 * POST /api/academic-years
 * Create a new academic year with transaction
 */
export async function POST(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const data = await req.json();

      // Validate required fields
      if (!data.schoolId || !data.name || !data.startDate || !data.endDate) {
        return NextResponse.json(
          { error: "Missing required fields: schoolId, name, startDate, endDate" },
          { status: 400 }
        );
      }

      // Use transaction to enforce business rules
      const academicYear = await prisma.$transaction(async (tx) => {
        // Validate academic year data
        await validateAcademicYear(tx, {
          schoolId: data.schoolId,
          name: data.name,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          isCurrent: data.isCurrent || false,
        });

        // Create academic year
        const created = await tx.academicYear.create({
          data: {
            schoolId: data.schoolId,
            name: data.name,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            isCurrent: data.isCurrent || false,
            isLocked: data.isLocked || false,
          },
        });

        // Enforce single current academic year rule
        if (data.isCurrent) {
          await validateAndEnforceSingleCurrentAcademicYear(
            tx,
            data.schoolId,
            created.id,
            true
          );
        }

        return created;
      });

      return NextResponse.json(
        { success: true, academicYear },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating academic year:", error);

      if (error instanceof BusinessRuleError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(
        { error: "Failed to create academic year" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}

/**
 * PUT /api/academic-years
 * Update academic year with transaction and lock checking
 */
export async function PUT(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const data = await req.json();

      if (!data.id) {
        return NextResponse.json(
          { error: "Academic year ID is required" },
          { status: 400 }
        );
      }

      // Use transaction for multi-step update
      const academicYear = await prisma.$transaction(async (tx) => {
        // Check if academic year is locked
        await assertAcademicYearNotLocked(tx, data.id);

        // Get existing academic year
        const existing = await tx.academicYear.findUnique({
          where: { id: data.id },
        });

        if (!existing) {
          throw new BusinessRuleError("Academic year not found");
        }

        // Validate if dates are being updated
        if (data.startDate || data.endDate) {
          await validateAcademicYear(tx, {
            schoolId: existing.schoolId,
            id: data.id,
            name: data.name || existing.name,
            startDate: data.startDate
              ? new Date(data.startDate)
              : existing.startDate,
            endDate: data.endDate ? new Date(data.endDate) : existing.endDate,
            isCurrent: data.isCurrent !== undefined
              ? data.isCurrent
              : existing.isCurrent,
          });
        }

        // Update academic year
        const updated = await tx.academicYear.update({
          where: { id: data.id },
          data: {
            name: data.name,
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
            isCurrent: data.isCurrent,
            isLocked: data.isLocked,
          },
        });

        // Enforce single current academic year rule if isCurrent changed
        if (data.isCurrent !== undefined && data.isCurrent !== existing.isCurrent) {
          await validateAndEnforceSingleCurrentAcademicYear(
            tx,
            existing.schoolId,
            data.id,
            data.isCurrent
          );
        }

        return updated;
      });

      return NextResponse.json({ success: true, academicYear });
    } catch (error) {
      console.error("Error updating academic year:", error);

      if (error instanceof BusinessRuleError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(
        { error: "Failed to update academic year" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}

/**
 * DELETE /api/academic-years?id={id}
 * Delete academic year (cannot delete if locked)
 */
export async function DELETE(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json(
          { error: "Academic year ID is required" },
          { status: 400 }
        );
      }

      // Use transaction
      await prisma.$transaction(async (tx) => {
        // Check if locked
        await assertAcademicYearNotLocked(tx, id);

        // Delete (terms will cascade delete)
        await tx.academicYear.delete({
          where: { id },
        });
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error("Error deleting academic year:", error);

      if (error instanceof BusinessRuleError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(
        { error: "Failed to delete academic year" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}
