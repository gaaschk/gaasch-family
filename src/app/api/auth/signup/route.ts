import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string };
  const email = (body.email ?? '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  // User exists and already has a password — tell them to sign in
  if (existing?.password) {
    return NextResponse.json(
      { error: 'An account with that email already exists. Please sign in.' },
      { status: 409 },
    );
  }

  // User doesn't exist yet — create a pending account
  if (!existing) {
    await prisma.user.create({ data: { email, role: 'pending' } });
  }

  // Generate a secure token and store it (delete any previous tokens for this email first)
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  const token   = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await prisma.verificationToken.create({ data: { identifier: email, token, expires } });

  await sendVerificationEmail(email, token);

  // Always return 200 — don't reveal whether the email already had an account
  return NextResponse.json({ ok: true });
}
