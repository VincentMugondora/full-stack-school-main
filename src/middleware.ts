import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routeAccessMap } from "./lib/settings";
import { NextResponse } from "next/server";

const matchers = Object.keys(routeAccessMap).map((route) => ({
  matcher: createRouteMatcher([route]),
  allowedRoles: routeAccessMap[route],
}));

export default clerkMiddleware(async (auth, req) => {
  // Skip middleware for auth routes and root to allow redirects to work
  if (req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/sign-in") || req.nextUrl.pathname.startsWith("/sign-up")) {
    return;
  }

  // if (isProtectedRoute(req)) auth().protect()

  const { userId, sessionClaims } = await auth();

  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

  for (const { matcher, allowedRoles } of matchers) {
    if (!matcher(req)) continue;

    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL(role ? `/${role}` : "/sign-in", req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
