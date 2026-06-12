import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/pay", "/api/rides/request", "/api/analytics/pageview", "/api/stripe/webhook"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths through without auth check
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  // Allow Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/icon")) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.ico$).*)"],
};
