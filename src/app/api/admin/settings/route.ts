import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole('admin');
  if (auth instanceof NextResponse) return auth;

  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: 'asc' },
  });

  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('admin');
  if (auth instanceof NextResponse) return auth;

  const body = await req.json() as { key?: string; value?: string };
  const { key, value } = body;

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }
  if (value === undefined || typeof value !== 'string') {
    return NextResponse.json({ error: 'value is required' }, { status: 400 });
  }

  const setting = await prisma.systemSetting.upsert({
    where:  { key },
    update: { value },
    create: { key, value },
  });

  return NextResponse.json(setting);
}
