import { NextResponse } from "next/server";
import { withRoleAuth } from "@/lib/security";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/users
 * List all users - Admin only
 */
export async function GET() {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          clerkId: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ success: true, users });
    } catch (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin" as UserRole])(new Request(""));
}

/**
 * POST /api/admin/users
 * Create a new user - Admin only
 */
export async function POST(request: Request) {
  const handler = async (req: Request, user: { id: string; role: UserRole }) => {
    try {
      const data = await req.json();

      // Validate input
      if (!data.email || !data.role) {
        return NextResponse.json(
          { error: "Email and role are required" },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.email },
            ...(data.username ? [{ username: data.username }] : []),
          ],
        },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            error: "User already exists",
            field: existingUser.email === data.email ? "email" : "username",
          },
          { status: 400 }
        );
      }

      // Create new user
      const newUser = await prisma.user.create({
        data: {
          id: data.clerkId || `temp_${Date.now()}`,
          clerkId: data.clerkId || `temp_${Date.now()}`,
          email: data.email,
          username: data.username,
          role: data.role,
        },
        select: {
          id: true,
          clerkId: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json(
        { success: true, user: newUser },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating user:", error);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }
  };

  return withRoleAuth(handler, ["admin" as UserRole])(request);
}
