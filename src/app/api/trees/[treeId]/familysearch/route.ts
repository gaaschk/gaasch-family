/**
 * GET  /api/trees/[treeId]/familysearch?q=name   — search FamilySearch
 * GET  /api/trees/[treeId]/familysearch?status=1 — check connection status
 * DELETE /api/trees/[treeId]/familysearch         — disconnect
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireTreeAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAccessToken, searchFamilySearch } from '@/lib/familysearch';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const { searchParams } = req.nextUrl;

  // Status check
  if (searchParams.get('status')) {
    const record = await prisma.familySearchToken.findUnique({ where: { userId } });
    return NextResponse.json({
      connected:   !!record,
      displayName: record?.displayName ?? null,
    });
  }

  // Search
  const q = searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 });

  const token = await getAccessToken(userId);
  if (!token) {
    return NextResponse.json({ error: 'Not connected to FamilySearch' }, { status: 401 });
  }

  try {
    const results = await searchFamilySearch(token, q, 12);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  await prisma.familySearchToken.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
