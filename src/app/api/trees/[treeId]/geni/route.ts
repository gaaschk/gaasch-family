/**
 * GET  /api/trees/[treeId]/geni?status=1 — check connection status
 * DELETE /api/trees/[treeId]/geni         — disconnect
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireTreeAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const record = await prisma.geniToken.findUnique({ where: { userId } });
  return NextResponse.json({
    connected:   !!record,
    displayName: record?.displayName ?? null,
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  await prisma.geniToken.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
