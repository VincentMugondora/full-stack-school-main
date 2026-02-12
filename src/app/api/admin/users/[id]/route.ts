import { NextResponse } from "next/server";
import { withRoleAuth, requireRole, AuthUser } from "@/lib/security";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/admin/users/[id]
 * Get a specific user by ID
 * - Admin: can view any user
 * - Other users: can only view their own profile
 */
export async function GET(request: Request, { params }: RouteParams) {
  const handler = async (req: Request, user: AuthUser) => {
    try {
      const targetUserId = params.id;

      // Check if user can access this profile
      const canAccess =
        user.role === "admin" ||
        user.id === targetUserId ||
        user.clerkId === targetUserId;

      if (!canAccess) {
        return NextResponse.json(
          { error: "Forbidden - Can only view own profile" },
          { status: 403 }
        );
      }

      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [{ id: targetUserId }, { clerkId: targetUserId }],
        },
        select: {
          id: true,
          clerkId: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, user: targetUser });
    } catch (error) {
      console.error("Error fetching user:", error);
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      );
    }
  };

  // Allow all authenticated users, but handler checks specific access
  return withRoleAuth(handler, [
    "admin",
    "teacher",
    "student",
    "parent",
  ] as UserRole[])(request);
}

/**
 * PUT /api/admin/users/[id]
 * Update a user
 * - Admin: can update any user including role changes
 * - Other users: can only update their own profile, cannot change role
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const handler = async (req: Request, user: AuthUser) => {
    try {
      const targetUserId = params.id;
      const data = await req.json();

      // Check if user can modify this profile
      const isAdmin = user.role === "admin";
      const isSelf = user.id === targetUserId || user.clerkId === targetUserId;

      if (!isAdmin && !isSelf) {
        return NextResponse.json(
          { error: "Forbidden - Can only modify own profile" },
          { status: 403 }
        );
      }

      // Non-admins cannot change role
      if (!isAdmin && data.role) {
        return NextResponse.json(
          { error: "Forbidden - Cannot change role" },
          { status: 403 }
        );
      }

      // Only admins can assign admin role
      if (data.role === "admin" && !isAdmin) {
        return NextResponse.json(
          { error: "Forbidden - Only admins can assign admin role" },
          { status: 403 }
        );
      }

      // Non-admins cannot change email
      if (!isAdmin && data.email) {
        return NextResponse.json(
          { error: "Forbidden - Cannot change email" },
          { status: 403 }
        );
      }

      // Build update data based on permissions
      const updateData: any = {};
      if (data.username !== undefined) updateData.username = data.username;
      if (isAdmin) {
        if (data.email !== undefined) updateData.email = data.email;
        if (data.role !== undefined) updateData.role = data.role;
      }

      const updatedUser = await prisma.user.update({
        where: {
          id: targetUserId,
        },
        data: updateData,
        select: {
          id: true,
          clerkId: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user:", error);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }
  };

  // Allow all authenticated users, but handler checks specific permissions
  return withRoleAuth(handler, [
    "admin",
    "teacher",
    "student",
    "parent",
  ] as UserRole[])(request);
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user - Admin only
 * Cannot delete own account
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const handler = async (req: Request, user: AuthUser) => {
    try {
      const targetUserId = params.id;

      // Prevent self-deletion
      if (user.id === targetUserId || user.clerkId === targetUserId) {
        return NextResponse.json(
          { error: "Cannot delete your own account" },
          { status: 400 }
        );
      }

      // Check if target user exists
      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [{ id: targetUserId }, { clerkId: targetUserId }],
        },
        select: { id: true, role: true },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // Prevent deleting other admins (optional security measure)
      if (targetUser.role === "admin") {
        return NextResponse.json(
          { error: "Cannot delete admin users through API" },
          { status: 403 }
        );
      }

      await prisma.user.delete({
        where: { id: targetUser.id },
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }
  };

  // Only admins can delete users
  return withRoleAuth(handler, ["admin" as UserRole])(request);
}
