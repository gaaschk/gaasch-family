import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function requiresAuth(nextPath: string) {
  const protectedPaths = ['/dashboard', '/trees', '/home', '/signup', '/login'];
  return protectedPaths.some(p => nextPath.startsWith(p));
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (requiresAuth(pathname)) {
    const hasAuth = !!req.cookies.get('session') || !!req.headers.get('authorization');
    if (!hasAuth) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/trees/:treeId/:path*', '/trees/:treeId'],
};
