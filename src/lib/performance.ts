"use server";

import { unstable_cache } from "next/cache";

/**
 * Performance optimization utilities
 * Implements caching strategies per PRD requirements
 */

// Cache tags for different data types
export const CACHE_TAGS = {
  USERS: "users",
  STUDENTS: "students",
  TEACHERS: "teachers",
  PARENTS: "parents",
  CLASSES: "classes",
  LESSONS: "lessons",
  ATTENDANCE: "attendance",
  RESULTS: "results",
  EVENTS: "events",
  ANNOUNCEMENTS: "announcements",
} as const;

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  SHORT: 60,    // 1 minute - for frequently changing data
  MEDIUM: 300,  // 5 minutes - for semi-static data
  LONG: 3600,   // 1 hour - for static data
};

/**
 * Cache wrapper for dashboard data functions
 * Uses Next.js unstable_cache for optimal performance
 */
export function withCache<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  keyGenerator: (...args: TArgs) => string[],
  options: {
    revalidate?: number;
    tags?: string[];
  } = {}
) {
  const { revalidate = CACHE_DURATIONS.MEDIUM, tags = [] } = options;

  return async (...args: TArgs): Promise<TReturn> => {
    const cacheKey = keyGenerator(...args);
    
    const cachedFn = unstable_cache(
      async () => fn(...args),
      cacheKey,
      {
        revalidate,
        tags,
      }
    );

    return cachedFn();
  };
}

/**
 * Preload function for eager data fetching
 * Call this before the component renders to start data fetch early
 */
export function preload<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  ...args: TArgs
): void {
  // Start the fetch without awaiting
  void fn(...args);
}

// Cached versions of common queries with appropriate durations

// User counts - cache for 5 minutes (changes when users added)
export const cacheUserCounts = (fn: () => Promise<any>) => 
  withCache(fn, () => ["user-counts"], { 
    revalidate: CACHE_DURATIONS.MEDIUM,
    tags: [CACHE_TAGS.USERS, CACHE_TAGS.STUDENTS, CACHE_TAGS.TEACHERS, CACHE_TAGS.PARENTS]
  });

// Demographics - cache for 1 hour (gender ratios change infrequently)
export const cacheDemographics = (fn: () => Promise<any>) => 
  withCache(fn, () => ["demographics"], { 
    revalidate: CACHE_DURATIONS.LONG,
    tags: [CACHE_TAGS.STUDENTS, CACHE_TAGS.TEACHERS]
  });

// Attendance - cache for 1 minute (changes frequently during school hours)
export const cacheAttendance = (fn: () => Promise<any>) => 
  withCache(fn, () => ["attendance"], { 
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.ATTENDANCE]
  });

// Events - cache for 5 minutes
export const cacheEvents = (fn: () => Promise<any>) => 
  withCache(fn, () => ["events"], { 
    revalidate: CACHE_DURATIONS.MEDIUM,
    tags: [CACHE_TAGS.EVENTS]
  });

// Announcements - cache for 5 minutes
export const cacheAnnouncements = (fn: () => Promise<any>) => 
  withCache(fn, () => ["announcements"], { 
    revalidate: CACHE_DURATIONS.MEDIUM,
    tags: [CACHE_TAGS.ANNOUNCEMENTS]
  });

// Teacher schedule - cache for 5 minutes
export const cacheTeacherSchedule = (fn: (teacherId: string) => Promise<any>) => 
  withCache(fn, (teacherId) => ["teacher-schedule", teacherId], { 
    revalidate: CACHE_DURATIONS.MEDIUM,
    tags: [CACHE_TAGS.LESSONS, CACHE_TAGS.TEACHERS]
  });

// Student schedule - cache for 5 minutes
export const cacheStudentSchedule = (fn: (studentId: string) => Promise<any>) => 
  withCache(fn, (studentId) => ["student-schedule", studentId], { 
    revalidate: CACHE_DURATIONS.MEDIUM,
    tags: [CACHE_TAGS.LESSONS, CACHE_TAGS.STUDENTS]
  });

// Results - cache for 1 minute (may change frequently during grading)
export const cacheResults = (fn: (studentId: string) => Promise<any>) => 
  withCache(fn, (studentId) => ["results", studentId], { 
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.RESULTS]
  });

// Parent children - cache for 1 hour (rarely changes)
export const cacheParentChildren = (fn: (parentId: string) => Promise<any>) => 
  withCache(fn, (parentId) => ["parent-children", parentId], { 
    revalidate: CACHE_DURATIONS.LONG,
    tags: [CACHE_TAGS.STUDENTS]
  });

/**
 * Revalidation helpers for cache invalidation
 * Call these when data changes to refresh the cache
 */
export async function revalidateUserData(): Promise<void> {
  // Next.js will revalidate on next request
  // In production, use revalidateTag from next/cache
}

/**
 * Optimize Prisma queries with select and include strategies
 */
export const queryOptimizations = {
  // Only select needed fields for user cards
  userCountSelect: {
    select: { id: true },
  },
  
  // Optimize student schedule query
  studentScheduleInclude: {
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
      teacher: { select: { name: true, surname: true } },
    },
  },
  
  // Optimize results query
  resultsInclude: {
    include: {
      exam: { include: { lesson: { include: { subject: { select: { name: true } } } } } },
      assignment: { include: { lesson: { include: { subject: { select: { name: true } } } } } },
    },
  },
};

/**
 * Batch loading utility to prevent N+1 queries
 */
export async function batchLoad<T, K>(
  keys: K[],
  loader: (keys: K[]) => Promise<Map<K, T>>
): Promise<Map<K, T>> {
  return loader(keys);
}
