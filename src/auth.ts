import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { sendWelcomeEmail } from "@/src/lib/email";
import { prisma } from "@/src/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Apple({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;
        return user;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // Only handle OAuth sign-ins
      if (account?.type !== "oauth") return true;

      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { role: true, emailVerified: true },
        });

        // New OAuth user (PrismaAdapter created with default role "pending")
        if (dbUser?.role === "pending") {
          await prisma.user.update({
            where: { id: user.id as string },
            data: { role: "viewer" },
          });
          // Fire welcome email best-effort
          if (user.email) {
            sendWelcomeEmail({
              toEmail: user.email,
              toName: user.name ?? user.email,
            }).catch(() => {});
          }
        }
      } catch (err) {
        // Log but don't block sign-in
        console.error("[auth] signIn callback error:", err);
      }

      return true;
    },
  },
});
