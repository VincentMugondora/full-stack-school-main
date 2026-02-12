"use server";

import prisma from "./prisma";

/**
 * Business Rules Module
 * Enforces:
 * 1. Only one AcademicYear can be current per school
 * 2. Terms cannot be modified if isLocked is true
 * 3. Use transactions for multi-step updates
 */

export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

// Type for Prisma transaction client
type PrismaTransaction = typeof prisma;

/**
 * Validates that only one AcademicYear is marked as current per school.
 * If setting an academic year as current, automatically unset any existing current year.
 */
export async function validateAndEnforceSingleCurrentAcademicYear(
  tx: PrismaTransaction,
  schoolId: string,
  academicYearId: string,
  isCurrent: boolean
): Promise<void> {
  if (!isCurrent) return;

  // Unset any existing current academic year for this school
  await tx.academicYear.updateMany({
    where: {
      schoolId,
      isCurrent: true,
      id: { not: academicYearId },
    },
    data: { isCurrent: false },
  });
}

/**
 * Checks if an academic year is locked.
 * Throws error if trying to modify a locked academic year.
 */
export async function assertAcademicYearNotLocked(
  tx: PrismaTransaction,
  academicYearId: string
): Promise<void> {
  const academicYear = await tx.academicYear.findUnique({
    where: { id: academicYearId },
    select: { isLocked: true, name: true },
  });

  if (!academicYear) {
    throw new BusinessRuleError("Academic year not found");
  }

  if (academicYear.isLocked) {
    throw new BusinessRuleError(
      `Academic year "${academicYear.name}" is locked and cannot be modified`
    );
  }
}

/**
 * Checks if a term is locked.
 * Throws error if trying to modify a locked term.
 */
export async function assertTermNotLocked(
  tx: PrismaTransaction,
  termId: string
): Promise<void> {
  const term = await tx.term.findUnique({
    where: { id: termId },
    select: { isLocked: true, name: true },
  });

  if (!term) {
    throw new BusinessRuleError("Term not found");
  }

  if (term.isLocked) {
    throw new BusinessRuleError(
      `Term "${term.name}" is locked and cannot be modified`
    );
  }
}

/**
 * Validates date ranges for academic years and terms.
 * Ensures:
 * - Start date is before end date
 * - Terms fall within their academic year
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date,
  context: string
): void {
  if (startDate >= endDate) {
    throw new BusinessRuleError(
      `${context}: Start date must be before end date`
    );
  }
}

/**
 * Validates that term dates fall within the parent academic year.
 */
export function validateTermDatesWithinAcademicYear(
  termStartDate: Date,
  termEndDate: Date,
  academicYearStartDate: Date,
  academicYearEndDate: Date
): void {
  if (termStartDate < academicYearStartDate || termEndDate > academicYearEndDate) {
    throw new BusinessRuleError(
      "Term dates must fall within the academic year dates"
    );
  }
}

/**
 * Comprehensive validation for creating/updating an academic year.
 */
export async function validateAcademicYear(
  tx: PrismaTransaction,
  data: {
    schoolId: string;
    id?: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isCurrent: boolean;
  }
): Promise<void> {
  // Validate date range
  validateDateRange(data.startDate, data.endDate, "Academic year");

  // Check for overlapping academic years
  const overlappingYear = await tx.academicYear.findFirst({
    where: {
      schoolId: data.schoolId,
      id: data.id ? { not: data.id } : undefined,
      OR: [
        {
          // New year starts within existing year
          AND: [
            { startDate: { lte: data.startDate } },
            { endDate: { gte: data.startDate } },
          ],
        },
        {
          // New year ends within existing year
          AND: [
            { startDate: { lte: data.endDate } },
            { endDate: { gte: data.endDate } },
          ],
        },
        {
          // New year completely contains existing year
          AND: [
            { startDate: { gte: data.startDate } },
            { endDate: { lte: data.endDate } },
          ],
        },
      ],
    },
  });

  if (overlappingYear) {
    throw new BusinessRuleError(
      `Academic year dates overlap with existing year "${overlappingYear.name}"`
    );
  }
}

/**
 * Comprehensive validation for creating/updating a term.
 */
export async function validateTerm(
  tx: PrismaTransaction,
  data: {
    id?: string;
    name: string;
    startDate: Date;
    endDate: Date;
    academicYearId: string;
  }
): Promise<void> {
  // Validate date range
  validateDateRange(data.startDate, data.endDate, "Term");

  // Get parent academic year
  const academicYear = await tx.academicYear.findUnique({
    where: { id: data.academicYearId },
  });

  if (!academicYear) {
    throw new BusinessRuleError("Parent academic year not found");
  }

  // Validate term dates within academic year
  validateTermDatesWithinAcademicYear(
    data.startDate,
    data.endDate,
    academicYear.startDate,
    academicYear.endDate
  );

  // Check for overlapping terms in the same academic year
  const overlappingTerm = await tx.term.findFirst({
    where: {
      academicYearId: data.academicYearId,
      id: data.id ? { not: data.id } : undefined,
      OR: [
        {
          AND: [
            { startDate: { lte: data.startDate } },
            { endDate: { gte: data.startDate } },
          ],
        },
        {
          AND: [
            { startDate: { lte: data.endDate } },
            { endDate: { gte: data.endDate } },
          ],
        },
        {
          AND: [
            { startDate: { gte: data.startDate } },
            { endDate: { lte: data.endDate } },
          ],
        },
      ],
    },
  });

  if (overlappingTerm) {
    throw new BusinessRuleError(
      `Term dates overlap with existing term "${overlappingTerm.name}"`
    );
  }
}
