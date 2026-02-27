import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session     = req.auth;
  const pathname    = nextUrl.pathname;

  // Legacy /admin → redirect to /dashboard
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  const isOldAdmin   = pathname.startsWith('/admin');
  const isDashboard  = pathname.startsWith('/dashboard');
  const isTreeRoute  = pathname.startsWith('/trees/');
  const isInvite     = pathname.startsWith('/invite/');

  const requiresAuth = isOldAdmin || isDashboard || isTreeRoute || isInvite;

  if (requiresAuth && !session?.user) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (requiresAuth && session?.user?.role === 'pending') {
    return NextResponse.redirect(new URL('/awaiting-approval', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
