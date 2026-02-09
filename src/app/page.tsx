import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  
  console.log("[DEBUG] userId:", userId);
  console.log("[DEBUG] publicMetadata:", JSON.stringify(user?.publicMetadata));
  console.log("[DEBUG] extracted role:", role);
  
  redirect(role ? `/${role}` : "/admin");
}
