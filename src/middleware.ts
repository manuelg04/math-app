import { NextResponse, type NextRequest } from "next/server";
import { verifyJwt } from "@/lib/token";

const COOKIE_NAME = "math_app_token";
const PUBLIC_AUTH_PATHS = new Set(["/login", "/registro", "/recuperar", "/restablecer"]);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value ?? "";
  const decodedToken = token ? await verifyJwt(token) : null;
  const isAuthenticated = Boolean(decodedToken);
  const { pathname } = request.nextUrl;

  if (!isAuthenticated) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }


  if (PUBLIC_AUTH_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/login", "/registro", "/recuperar", "/restablecer"],
};
