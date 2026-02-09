"use client";

import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="h-screen flex items-center justify-center bg-lamaSkyLight">
      <SignUp routing="hash" fallbackRedirectUrl="/admin" />
    </div>
  );
}
