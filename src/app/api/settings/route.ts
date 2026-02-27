import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET — return all settings; values are masked for sensitive keys
export async function GET(_req: NextRequest) {
  const auth = await requireRole('admin');
  if (auth instanceof NextResponse) return auth;

  const settings = await prisma.setting.findMany();

  const SENSITIVE = ['key', 'secret', 'token'];
  // Mask sensitive values: show only last 4 chars
  const masked = settings.map(s => ({
    key: s.key,
    value: SENSITIVE.some(k => s.key.includes(k))
      ? (s.value.length > 4 ? `${'•'.repeat(s.value.length - 4)}${s.value.slice(-4)}` : '••••')
      : s.value,
    updatedAt: s.updatedAt,
  }));

  return NextResponse.json(masked);
}

// POST — upsert a setting by key
export async function POST(req: NextRequest) {
  const auth = await requireRole('admin');
  if (auth instanceof NextResponse) return auth;

  const { key, value } = await req.json();
  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  await prisma.setting.upsert({
    where:  { key },
    create: { key, value: value ?? '' },
    update: { value: value ?? '' },
  });

  return NextResponse.json({ ok: true });
}
