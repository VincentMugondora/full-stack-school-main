import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  redirect(role ? `/${role}` : "/admin");
}
