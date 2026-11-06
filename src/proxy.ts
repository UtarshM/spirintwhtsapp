import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const pathname = url.pathname;

  const isAppSubdomain =
    hostname.startsWith("app.") || hostname.startsWith("dashboard.");
  const isAdminSubdomain = hostname.startsWith("admin.");

  // If on "admin.*" subdomain (e.g. admin.scalezix.ai or admin.localhost:3000)
  if (isAdminSubdomain) {
    // Root of admin subdomain rewrites to /admin portal
    if (pathname === "/") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }
    // Direct /admin requests pass through
    if (pathname.startsWith("/admin")) {
      return NextResponse.next();
    }
    // Block client workspace routes on admin subdomain
    if (pathname.startsWith("/dashboard")) {
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // If on "app.*" subdomain (e.g. app.scalezix.ai or app.localhost:3000)
  if (isAppSubdomain) {
    // Root of app subdomain rewrites to /dashboard
    if (pathname === "/") {
      url.pathname = "/dashboard";
      return NextResponse.rewrite(url);
    }
    // Strict isolation: Client app subdomain can NEVER access /admin
    if (pathname.startsWith("/admin")) {
      url.pathname = "/not-found";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Main domain (e.g. scalezix.ai, www.scalezix.ai, localhost:3000)
  // Keeps full developer backward compatibility
  return NextResponse.next();
}

// Next.js 15/16 backward-compatibility alias
export { proxy as middleware };

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|sitemap.xml|robots.txt).*)",
  ],
};

