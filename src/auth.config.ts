import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe Auth.js config — no Node.js-only imports.
 * Used by middleware (Edge Runtime) and spread into the full auth.ts config.
 */

export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
    maxAge:   30 * 60, // 30 minutes
  },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as unknown as { role: string }).role ?? 'pending';
      }
      return token;
    },
    session({ session, token }) {
      if (!token?.id) return session;
      session.user.id   = token.id   as string;
      session.user.role = token.role as string;
      return session;
    },
  },
  providers: [],
};
