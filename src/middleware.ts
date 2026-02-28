import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session     = req.auth;
  const pathname    = nextUrl.pathname;

  const isAdminArea  = pathname.startsWith('/admin');
  const isDashboard  = pathname.startsWith('/dashboard');
  const isHomePage   = pathname.startsWith('/home');
  const isTreeRoute  = pathname.startsWith('/trees/');
  const isInvite     = pathname.startsWith('/invite/');
  const isStoryPage  = /^\/trees\/[^/]+\/stories(\/|$)/.test(pathname);

  const requiresAuth = !isStoryPage && (isAdminArea || isDashboard || isHomePage || isTreeRoute || isInvite);

  if (requiresAuth && !session?.user) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Pending users can still accept invites — the invite page handles the upgrade
  if (requiresAuth && !isInvite && session?.user?.role === 'pending') {
    return NextResponse.redirect(new URL('/awaiting-approval', nextUrl));
  }

  // System admin area requires platform admin role
  if (isAdminArea && session?.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
