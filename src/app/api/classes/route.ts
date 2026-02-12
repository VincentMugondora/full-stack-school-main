import { NextResponse } from "next/server";
import { withRoleAuth } from "@/lib/security";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * GET /api/classes?schoolId={id}
 * List all classes for a school
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

      // Teachers can only view classes they're assigned to
      let whereClause: any = { schoolId };
      
      if (user.role === "teacher") {
        const teacher = await prisma.teacher.findFirst({
          where: { userId: user.id },
        });
        if (teacher) {
          whereClause.teacherId = teacher.id;
        }
      }

      const classes = await prisma.class.findMany({
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
        orderBy: { grade: "asc" },
      });

      return NextResponse.json({ success: true, classes });
    } catch (error) {
      console.error("Error fetching classes:", error);
      return NextResponse.json(
        { error: "Failed to fetch classes" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin", "teacher"] as UserRole[])(request);
}

/**
 * POST /api/classes
 * Create a new class
 */
export async function POST(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const data = await req.json();

      if (!data.schoolId || !data.name || !data.grade) {
        return NextResponse.json(
          { error: "schoolId, name, and grade are required" },
          { status: 400 }
        );
      }

      const newClass = await prisma.class.create({
        data: {
          schoolId: data.schoolId,
          name: data.name,
          grade: data.grade,
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
        { success: true, class: newClass },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating class:", error);
      return NextResponse.json(
        { error: "Failed to create class" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}

/**
 * PUT /api/classes
 * Update class (assign teacher, change name/grade)
 */
export async function PUT(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const data = await req.json();

      if (!data.id) {
        return NextResponse.json(
          { error: "Class ID is required" },
          { status: 400 }
        );
      }

      const updatedClass = await prisma.class.update({
        where: { id: data.id },
        data: {
          name: data.name,
          grade: data.grade,
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

      return NextResponse.json({ success: true, class: updatedClass });
    } catch (error) {
      console.error("Error updating class:", error);
      return NextResponse.json(
        { error: "Failed to update class" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}

/**
 * DELETE /api/classes?id={id}
 * Delete a class
 */
export async function DELETE(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json(
          { error: "Class ID is required" },
          { status: 400 }
        );
      }

      await prisma.class.delete({ where: { id } });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error("Error deleting class:", error);
      return NextResponse.json(
        { error: "Failed to delete class" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}
