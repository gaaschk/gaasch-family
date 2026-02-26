import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireRole('admin');
  if (auth instanceof NextResponse) return auth;

  await prisma.user.updateMany({
    data: { tokenVersion: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
