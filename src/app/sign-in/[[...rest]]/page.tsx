"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
    if (role) {
      router.replace(`/${role}`);
    }
  }, [isLoaded, isSignedIn, router, user?.publicMetadata]);

  return (
    <div className="h-screen flex items-center justify-center bg-lamaSkyLight">
      <SignIn routing="hash" forceRedirectUrl="/" fallbackRedirectUrl="/" />
    </div>
  );
}
