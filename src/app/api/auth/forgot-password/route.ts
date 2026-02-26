import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string };
  const email = (body.email ?? '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  // Always return 200 — don't reveal whether the email exists
  const user = await prisma.user.findUnique({ where: { email } });

  // Only send reset if account exists and has a password set
  if (user?.password) {
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    const token   = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.verificationToken.create({ data: { identifier: email, token, expires } });
    await sendPasswordResetEmail(email, token);
  }

  return NextResponse.json({ ok: true });
}
