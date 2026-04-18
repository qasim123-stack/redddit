import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/", "/api/auth", "/dashboard", "/profiles", "/saved", "/crisis", "/trends", "/analysis", "/settings"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths without auth check
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Auth token stored in localStorage cannot be read server-side.
  // We use a short-lived cookie set from client-side after login.
  // Check for a presence cookie (value doesn't matter — just a signal).
  const authCookie = req.cookies.get("redddit-auth-present");

  if (!authCookie) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
