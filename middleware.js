// middleware.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ['/login', '/register'];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Get token from request
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  });

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // If no token and not on public pages, redirect to login
  if (!token && !isPublicPath) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If there is a token and on login/register pages, redirect to home
  if (token && isPublicPath) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};