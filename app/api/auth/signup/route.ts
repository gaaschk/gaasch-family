import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  sendSignupNotificationEmail,
} from "@/src/lib/email";

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
      { error: "Name, email, and password are required", code: "MISSING_FIELDS" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters", code: "PASSWORD_TOO_SHORT" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists", code: "EMAIL_TAKEN" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: "pending",
    },
  });

  // Notify admins (best-effort, non-blocking)
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { email: true },
    });
    const adminEmails = admins.map((a) => a.email);
    const approveUrl = `${process.env.AUTH_URL ?? ""}/dashboard/users`;
    await sendSignupNotificationEmail({
      newUserName: user.name ?? email,
      newUserEmail: user.email,
      adminEmails,
      approveUrl,
    });
  } catch {
    // notification failure is not fatal
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
