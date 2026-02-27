import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string }> };

// GET — list all pending, non-expired invites for the tree (admin only)
export async function GET(_req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const invites = await prisma.treeInvite.findMany({
    where: {
      treeId:     tree.id,
      acceptedAt: null,
      expiresAt:  { gt: new Date() },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(invites);
}
