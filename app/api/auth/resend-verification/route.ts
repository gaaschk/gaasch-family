import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth";
import { sendVerificationEmail } from "@/src/lib/email";
import { prisma } from "@/src/lib/prisma";

export async function POST(_req: Request) {
  const authResult = await requireRole("viewer");
  if (authResult instanceof NextResponse) return authResult;

  const { userId, email } = authResult;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Already verified — no-op
  if (user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  // Rate limit: 60-second cooldown
  const recent = await prisma.emailVerificationToken.findFirst({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 60 * 1000) },
    },
  });
  if (recent) {
    return NextResponse.json(
      {
        error: "Please wait before requesting another verification email",
        code: "RATE_LIMITED",
      },
      { status: 429 },
    );
  }

  // Delete old tokens
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });

  // Create new token
  const token = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const appUrl = process.env.AUTH_URL ?? "";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

  sendVerificationEmail({
    toEmail: email,
    toName: user.name ?? email,
    verifyUrl,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
