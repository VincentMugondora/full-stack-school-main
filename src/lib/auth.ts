"use server";

import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * Upsert user in database on first login.
 * Uses Clerk as identity source, creates DB record with role.
 */
export async function upsertUser(clerkUserId: string) {
  // First check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });

  if (existingUser) {
    return { success: true, user: existingUser, isNew: false };
  }

  // Fetch user from Clerk
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);

  if (!clerkUser) {
    return { success: false, error: "User not found in Clerk" };
  }

  // Get role from Clerk metadata (only used during onboarding)
  const roleFromMetadata = (clerkUser.publicMetadata?.role as string) || "student";
  
  // Validate role
  const validRoles: UserRole[] = ["admin", "teacher", "student", "parent"];
  const role = validRoles.includes(roleFromMetadata as UserRole) 
    ? (roleFromMetadata as UserRole) 
    : "student";

  // Get username and email
  const username = clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split("@")[0] || `user_${Date.now()}`;
  const email = clerkUser.emailAddresses[0]?.emailAddress;

  try {
    // Create user in database
    const user = await prisma.user.create({
      data: {
        id: clerkUserId,
        clerkId: clerkUserId,
        username,
        email,
        role,
      },
    });

    return { success: true, user, isNew: true };
  } catch (error: any) {
    // If username column doesn't exist, try without it
    if (error.message?.includes("username")) {
      const user = await prisma.user.create({
        data: {
          id: clerkUserId,
          clerkId: clerkUserId,
          email,
          role,
        },
      });
      return { success: true, user, isNew: true };
    }
    throw error;
  }
}

/**
 * Get user with role from database
 */
export async function getUserWithRole(clerkUserId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true, clerkId: true, username: true, email: true, role: true },
  });

  return user;
}
