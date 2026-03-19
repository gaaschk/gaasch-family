import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnTrees = nextUrl.pathname.startsWith("/trees");
      const isOnInvite = nextUrl.pathname.startsWith("/invite");
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnOnboarding = nextUrl.pathname.startsWith("/onboarding");

      if (
        isOnDashboard ||
        isOnTrees ||
        isOnInvite ||
        isOnAdmin ||
        isOnOnboarding
      ) {
        if (isLoggedIn) return true;
        return false;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "viewer";
        token.emailVerified =
          (user as { emailVerified?: Date | null }).emailVerified ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { emailVerified?: Date | null }).emailVerified =
          token.emailVerified as Date | null;
      }
      return session;
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 60 },
  providers: [],
};
