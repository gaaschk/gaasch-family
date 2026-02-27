import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string }> };

// GET — return all settings for tree; values are masked for sensitive keys
export async function GET(_req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const settings = await prisma.setting.findMany({ where: { treeId: tree.id } });

  const SENSITIVE = ['key', 'secret', 'token'];
  const masked = settings.map(s => ({
    key: s.key,
    value: SENSITIVE.some(k => s.key.includes(k))
      ? (s.value.length > 4 ? `${'•'.repeat(s.value.length - 4)}${s.value.slice(-4)}` : '••••')
      : s.value,
    updatedAt: s.updatedAt,
  }));

  return NextResponse.json(masked);
}

// POST — upsert a setting by key, scoped to this tree
export async function POST(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const { key, value } = await req.json();
  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  await prisma.setting.upsert({
    where:  { treeId_key: { treeId: tree.id, key } },
    create: { key, treeId: tree.id, value: value ?? '' },
    update: { value: value ?? '' },
  });

  return NextResponse.json({ ok: true });
}
