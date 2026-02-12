import { NextResponse } from "next/server";
import { withRoleAuth } from "@/lib/security";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  BusinessRuleError,
  validateTerm,
  assertTermNotLocked,
  assertAcademicYearNotLocked,
} from "@/lib/business-rules";

/**
 * GET /api/terms?academicYearId={id}
 * List all terms for an academic year
 */
export async function GET(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const { searchParams } = new URL(req.url);
      const academicYearId = searchParams.get("academicYearId");

      if (!academicYearId) {
        return NextResponse.json(
          { error: "academicYearId is required" },
          { status: 400 }
        );
      }

      const terms = await prisma.term.findMany({
        where: { academicYearId },
        orderBy: { startDate: "asc" },
      });

      return NextResponse.json({ success: true, terms });
    } catch (error) {
      console.error("Error fetching terms:", error);
      return NextResponse.json(
        { error: "Failed to fetch terms" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin", "teacher"] as UserRole[])(request);
}

/**
 * POST /api/terms
 * Create a new term with validation
 */
export async function POST(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const data = await req.json();

      // Validate required fields
      if (!data.academicYearId || !data.name || !data.startDate || !data.endDate) {
        return NextResponse.json(
          { error: "Missing required fields: academicYearId, name, startDate, endDate" },
          { status: 400 }
        );
      }

      // Use transaction
      const term = await prisma.$transaction(async (tx) => {
        // Check if parent academic year is locked
        await assertAcademicYearNotLocked(tx, data.academicYearId);

        // Validate term data
        await validateTerm(tx, {
          name: data.name,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          academicYearId: data.academicYearId,
        });

        // Create term
        return await tx.term.create({
          data: {
            academicYearId: data.academicYearId,
            name: data.name,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            isLocked: data.isLocked || false,
          },
        });
      });

      return NextResponse.json({ success: true, term }, { status: 201 });
    } catch (error) {
      console.error("Error creating term:", error);

      if (error instanceof BusinessRuleError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(
        { error: "Failed to create term" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}

/**
 * PUT /api/terms
 * Update term with lock protection
 */
export async function PUT(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const data = await req.json();

      if (!data.id) {
        return NextResponse.json(
          { error: "Term ID is required" },
          { status: 400 }
        );
      }

      // Use transaction
      const term = await prisma.$transaction(async (tx) => {
        // Check if term is locked - CANNOT MODIFY IF LOCKED
        await assertTermNotLocked(tx, data.id);

        // Get existing term
        const existing = await tx.term.findUnique({
          where: { id: data.id },
          include: { academicYear: true },
        });

        if (!existing) {
          throw new BusinessRuleError("Term not found");
        }

        // Check if parent academic year is locked
        await assertAcademicYearNotLocked(tx, existing.academicYearId);

        // Validate if dates are being updated
        if (data.startDate || data.endDate) {
          await validateTerm(tx, {
            id: data.id,
            name: data.name || existing.name,
            startDate: data.startDate
              ? new Date(data.startDate)
              : existing.startDate,
            endDate: data.endDate ? new Date(data.endDate) : existing.endDate,
            academicYearId: existing.academicYearId,
          });
        }

        // Update term
        return await tx.term.update({
          where: { id: data.id },
          data: {
            name: data.name,
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
            isLocked: data.isLocked,
          },
        });
      });

      return NextResponse.json({ success: true, term });
    } catch (error) {
      console.error("Error updating term:", error);

      if (error instanceof BusinessRuleError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(
        { error: "Failed to update term" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}

/**
 * DELETE /api/terms?id={id}
 * Delete term (cannot delete if locked)
 */
export async function DELETE(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json(
          { error: "Term ID is required" },
          { status: 400 }
        );
      }

      // Use transaction
      await prisma.$transaction(async (tx) => {
        // Check if term is locked
        await assertTermNotLocked(tx, id);

        // Get term to check parent academic year
        const term = await tx.term.findUnique({
          where: { id },
          select: { academicYearId: true },
        });

        if (!term) {
          throw new BusinessRuleError("Term not found");
        }

        // Check if parent academic year is locked
        await assertAcademicYearNotLocked(tx, term.academicYearId);

        // Delete term
        await tx.term.delete({ where: { id } });
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error("Error deleting term:", error);

      if (error instanceof BusinessRuleError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(
        { error: "Failed to delete term" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}
