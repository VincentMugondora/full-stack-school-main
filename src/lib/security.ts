"use server";

import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * Security utilities for data isolation and access control
 * Implements the PRD requirement: "Data-level authorization must validate ownership"
 */

export interface SecurityContext {
  userId: string;
  role: UserRole;
}

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
