import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session-token";

const SESSION_COOKIE = "md_session";
const publicRoutes = ["/login"];
const passwordChangeRoute = "/zmena-hesla";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Statické súbory v /public (napr. logo, fonty) musia ísť bez auth redirectu.
  const isStaticAsset = /\.[^/]+$/.test(pathname);
  if (isStaticAsset) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = publicRoutes.includes(pathname);

  if (!token) {
    if (!isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    const response = isPublic
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  if (payload.requiresPasswordChange) {
    if (pathname !== passwordChangeRoute) {
      return NextResponse.redirect(new URL(passwordChangeRoute, request.url));
    }
    return NextResponse.next();
  }

  if (pathname === passwordChangeRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
