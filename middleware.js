// middleware.js
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = ['/login', '/register'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // If not logged in and not on public pages, redirect to login
  if (!isLoggedIn && !isPublicPath) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If logged in and on login/register pages, redirect to home
  if (isLoggedIn && isPublicPath) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};