import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is enforced by (dashboard)/layout.tsx — proxy.ts only needs to handle
// the login-page redirect for already-authenticated users.
// Public paths (pay, public APIs) pass straight through.

const PUBLIC_PATHS = ["/login", "/pay", "/api/rides/request", "/api/stripe/webhook"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
