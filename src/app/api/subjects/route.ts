import { NextResponse } from "next/server";
import { withRoleAuth } from "@/lib/security";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * GET /api/subjects?schoolId={id}
 * List all subjects for a school
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

      // Teachers can only view subjects they're assigned to
      let whereClause: any = { schoolId };
      
      if (user.role === "teacher") {
        const teacher = await prisma.teacher.findFirst({
          where: { userId: user.id },
        });
        if (teacher) {
          whereClause.teacherId = teacher.id;
        }
      }

      const subjects = await prisma.subject.findMany({
        where: whereClause,
        include: {
          teacher: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({ success: true, subjects });
    } catch (error) {
      console.error("Error fetching subjects:", error);
      return NextResponse.json(
        { error: "Failed to fetch subjects" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin", "teacher"] as UserRole[])(request);
}

/**
 * POST /api/subjects
 * Create a new subject
 */
export async function POST(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const data = await req.json();

      if (!data.schoolId || !data.name) {
        return NextResponse.json(
          { error: "schoolId and name are required" },
          { status: 400 }
        );
      }

      const subject = await prisma.subject.create({
        data: {
          schoolId: data.schoolId,
          name: data.name,
          teacherId: data.teacherId || null,
        },
        include: {
          teacher: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      return NextResponse.json(
        { success: true, subject },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating subject:", error);
      return NextResponse.json(
        { error: "Failed to create subject" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}

/**
 * PUT /api/subjects
 * Update subject (assign teacher, change name)
 */
export async function PUT(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const data = await req.json();

      if (!data.id) {
        return NextResponse.json(
          { error: "Subject ID is required" },
          { status: 400 }
        );
      }

      const updatedSubject = await prisma.subject.update({
        where: { id: data.id },
        data: {
          name: data.name,
          teacherId: data.teacherId,
        },
        include: {
          teacher: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      return NextResponse.json({ success: true, subject: updatedSubject });
    } catch (error) {
      console.error("Error updating subject:", error);
      return NextResponse.json(
        { error: "Failed to update subject" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}

/**
 * DELETE /api/subjects?id={id}
 * Delete a subject
 */
export async function DELETE(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json(
          { error: "Subject ID is required" },
          { status: 400 }
        );
      }

      await prisma.subject.delete({ where: { id } });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error("Error deleting subject:", error);
      return NextResponse.json(
        { error: "Failed to delete subject" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}
