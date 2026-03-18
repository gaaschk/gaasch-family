import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { sendPasswordResetEmail } from "@/src/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Always return 200 — don't reveal whether the email exists
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: true });
  }

  // Expire any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password/${token}`;

  // Fire-and-forget — don't block or leak errors to the client
  sendPasswordResetEmail({
    toEmail: user.email,
    toName: user.name ?? user.email,
    resetUrl,
  }).catch((err) => console.error("Failed to send password reset email:", err));

  return NextResponse.json({ ok: true });
}
