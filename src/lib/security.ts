"use server";

import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Security utilities for data isolation and access control
 * Implements the PRD requirement: "Data-level authorization must validate ownership"
 */

export interface SecurityContext {
  userId: string;
  role: UserRole;
}

export type AllowedRoles = UserRole | UserRole[];

export interface AuthUser {
  id: string;
  clerkId: string;
  username: string | null;
  email: string | null;
  role: UserRole;
}

// ==========================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ==========================================

/**
 * Centralized function to enforce role-based access control
 * @param user - The authenticated user object
 * @param allowedRoles - Single role or array of allowed roles
 * @returns null if authorized, or NextResponse with 403 error if unauthorized
 */
export function requireRole(
  user: { role: UserRole } | null,
  allowedRoles: AllowedRoles
): NextResponse | null {
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized - User not found" },
      { status: 401 }
    );
  }

  const hasRole = Array.isArray(allowedRoles)
    ? allowedRoles.includes(user.role)
    : user.role === allowedRoles;

  if (!hasRole) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Helper function to check if user has required role (returns boolean)
 */
export function hasRole(
  user: { role: UserRole } | null,
  allowedRoles: AllowedRoles
): boolean {
  if (!user) return false;

  return Array.isArray(allowedRoles)
    ? allowedRoles.includes(user.role)
    : user.role === allowedRoles;
}

/**
 * Higher-order function to protect API routes with role-based authentication
 * @param handler - The route handler function
 * @param allowedRoles - Single role or array of allowed roles
 */
export function withRoleAuth(
  handler: (req: Request, user: AuthUser) => Promise<NextResponse>,
  allowedRoles: AllowedRoles
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      // Get authenticated user from Clerk
      const { userId: clerkId } = await auth();

      if (!clerkId) {
        return NextResponse.json(
          { error: "Unauthorized - Not authenticated" },
          { status: 401 }
        );
      }

      // Get user from database with role
      const user = await prisma.user.findUnique({
        where: { clerkId },
        select: {
          id: true,
          clerkId: true,
          username: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Unauthorized - User not found in database" },
          { status: 401 }
        );
      }

      // Check role authorization
      const authError = requireRole(user, allowedRoles);
      if (authError) return authError;

      // Call the protected handler
      return await handler(req, user as AuthUser);
    } catch (error) {
      console.error("Error in withRoleAuth:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware for checking authentication without role restrictions
 */
export function withAuth(
  handler: (req: Request, user: AuthUser) => Promise<NextResponse>
) {
  return withRoleAuth(handler, ["admin", "teacher", "student", "parent"] as UserRole[]);
}

/**
 * Get current authenticated user with role
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) return null;

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        clerkId: true,
        username: true,
        email: true,
        role: true,
      },
    });

    return user as AuthUser | null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// ==========================================
// DATA-LEVEL AUTHORIZATION (OWNERSHIP CHECKS)
// ==========================================

// Verify teacher owns a specific lesson
export async function verifyTeacherLessonAccess(teacherId: string, lessonId: number): Promise<boolean> {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, teacherId },
    select: { id: true },
  });
  return !!lesson;
}

// Verify teacher supervises a specific class
export async function verifyTeacherClassAccess(teacherId: string, classId: number): Promise<boolean> {
  const classData = await prisma.class.findFirst({
    where: { id: classId, supervisorId: teacherId },
    select: { id: true },
  });
  return !!classData;
}

// Verify parent owns a specific student
export async function verifyParentChildAccess(parentId: string, studentId: string): Promise<boolean> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, parentId },
    select: { id: true },
  });
  return !!student;
}

// Verify student owns a specific result/record
export async function verifyStudentRecordAccess(studentId: string, resultId: number): Promise<boolean> {
  const result = await prisma.result.findFirst({
    where: { id: resultId, studentId },
    select: { id: true },
  });
  return !!result;
}

// Verify student is in a specific class
export async function verifyStudentClassAccess(studentId: string, classId: number): Promise<boolean> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, classId },
    select: { id: true },
  });
  return !!student;
}

// Get all student IDs that a parent has access to
export async function getParentAccessibleStudents(parentId: string): Promise<string[]> {
  const students = await prisma.student.findMany({
    where: { parentId },
    select: { id: true },
  });
  return students.map((s: { id: string }) => s.id);
}

// Get all class IDs that a teacher has access to
export async function getTeacherAccessibleClasses(teacherId: string): Promise<number[]> {
  const classes = await prisma.class.findMany({
    where: { supervisorId: teacherId },
    select: { id: true },
  });
  return classes.map((c: { id: number }) => c.id);
}

// Security error for unauthorized access
export class SecurityError extends Error {
  constructor(message: string = "Unauthorized access to resource") {
    super(message);
    this.name = "SecurityError";
  }
}

// Wrapper to secure data access with ownership verification
export function withOwnershipCheck<TArgs extends any[], TReturn>(
  verifier: (...args: TArgs) => Promise<boolean>,
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const hasAccess = await verifier(...args);
    if (!hasAccess) {
      throw new SecurityError("You do not have permission to access this resource");
    }
    return fn(...args);
  };
}
