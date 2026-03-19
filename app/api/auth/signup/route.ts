import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { sendVerificationEmail, sendWelcomeEmail } from "@/src/lib/email";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const { name, email, password } = body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      {
        error: "Name, email, and password are required",
        code: "MISSING_FIELDS",
      },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      {
        error: "Password must be at least 8 characters",
        code: "PASSWORD_TOO_SHORT",
      },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: "An account with that email already exists",
        code: "EMAIL_TAKEN",
      },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "viewer",
    },
  });

  // Create email verification token (24hr TTL)
  const token = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const appUrl = process.env.AUTH_URL ?? "";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

  // Fire-and-forget emails
  sendWelcomeEmail({
    toEmail: user.email,
    toName: user.name ?? name.trim(),
  }).catch(() => {});
  sendVerificationEmail({
    toEmail: user.email,
    toName: user.name ?? name.trim(),
    verifyUrl,
  }).catch(() => {});

  return NextResponse.json({ ok: true }, { status: 201 });
}
