import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isAdmin = req.nextUrl.pathname.startsWith("/admin");
  const isLogin = req.nextUrl.pathname === "/admin/login";
  const isAuth = !!req.auth;

  if (isAdmin && !isLogin && !isAuth) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (isLogin && isAuth) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
