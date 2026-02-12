import { NextResponse } from "next/server";
import { withRoleAuth } from "@/lib/security";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * GET /api/teachers?schoolId={id}
 * List all teachers for a school
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

      // Check tenant isolation - only admin/teacher can view teachers for their school
      if (user.role !== "admin") {
        const teacher = await prisma.teacher.findFirst({
          where: { userId: user.id, schoolId },
        });
        if (!teacher) {
          return NextResponse.json(
            { error: "Forbidden - Cannot view teachers from other schools" },
            { status: 403 }
          );
        }
      }

      const teachers = await prisma.teacher.findMany({
        where: { schoolId },
        include: {
          user: {
            select: { id: true, email: true, name: true, username: true },
          },
          classes: true,
          subjects: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ success: true, teachers });
    } catch (error) {
      console.error("Error fetching teachers:", error);
      return NextResponse.json(
        { error: "Failed to fetch teachers" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin", "teacher"] as UserRole[])(request);
}

/**
 * POST /api/teachers
 * Create a new teacher (assign user as teacher)
 */
export async function POST(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const data = await req.json();

      if (!data.userId || !data.schoolId) {
        return NextResponse.json(
          { error: "userId and schoolId are required" },
          { status: 400 }
        );
      }

      // Check if user exists and update role to teacher
      const existingUser = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // Check if teacher already exists
      const existingTeacher = await prisma.teacher.findUnique({
        where: { userId: data.userId },
      });

      if (existingTeacher) {
        return NextResponse.json(
          { error: "Teacher already exists for this user" },
          { status: 400 }
        );
      }

      // Create teacher and update user role in transaction
      const teacher = await prisma.$transaction(async (tx) => {
        // Update user role to teacher
        await tx.user.update({
          where: { id: data.userId },
          data: { role: "teacher" },
        });

        // Create teacher record
        return await tx.teacher.create({
          data: {
            userId: data.userId,
            schoolId: data.schoolId,
          },
          include: {
            user: {
              select: { id: true, email: true, name: true, username: true },
            },
          },
        });
      });

      return NextResponse.json(
        { success: true, teacher },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating teacher:", error);
      return NextResponse.json(
        { error: "Failed to create teacher" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}

/**
 * DELETE /api/teachers?id={id}
 * Remove teacher assignment
 */
export async function DELETE(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json(
          { error: "Teacher ID is required" },
          { status: 400 }
        );
      }

      // Delete teacher and reset user role in transaction
      await prisma.$transaction(async (tx) => {
        const teacher = await tx.teacher.findUnique({
          where: { id },
          include: { user: true },
        });

        if (!teacher) {
          throw new Error("Teacher not found");
        }

        // Unassign from all classes
        await tx.class.updateMany({
          where: { teacherId: id },
          data: { teacherId: null },
        });

        // Unassign from all subjects
        await tx.subject.updateMany({
          where: { teacherId: id },
          data: { teacherId: null },
        });

        // Delete teacher record
        await tx.teacher.delete({ where: { id } });

        // Reset user role to student (default)
        await tx.user.update({
          where: { id: teacher.userId },
          data: { role: "student" },
        });
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error("Error deleting teacher:", error);
      return NextResponse.json(
        { error: "Failed to delete teacher" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin"] as UserRole[])(request);
}
