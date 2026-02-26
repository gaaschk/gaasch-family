import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session     = req.auth;
  const isAdmin     = nextUrl.pathname.startsWith('/admin');

  if (isAdmin && !session?.user) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  if (isAdmin && session?.user?.role === 'pending') {
    return NextResponse.redirect(new URL('/awaiting-approval', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
