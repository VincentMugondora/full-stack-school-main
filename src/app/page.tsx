import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { upsertUser, getUserWithRole } from "@/lib/auth";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Upsert user on first login (sync Clerk identity to DB)
  const { success } = await upsertUser(userId);
  
  if (!success) {
    redirect("/sign-in");
  }

  // Get role from DB (source of truth)
  const user = await getUserWithRole(userId);
  
  if (!user) {
    redirect("/sign-in");
  }

  // Redirect to role-specific dashboard
  redirect(`/${user.role}`);
}
