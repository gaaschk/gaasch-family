import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json() as { token?: string; email?: string; password?: string };
  const { token, email, password } = body;

  if (!token || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Validate the verification token
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
  });

  if (!record) {
    return NextResponse.json({ error: 'Link is invalid or has already been used.' }, { status: 400 });
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: email, token } },
    });
    return NextResponse.json({ error: 'Link has expired. Please request a new one.' }, { status: 400 });
  }

  // Hash the password and update the user
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { email },
    data:  { password: hash, emailVerified: new Date() },
  });

  // Delete the used token
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: email, token } },
  });

  return NextResponse.json({ ok: true });
}
