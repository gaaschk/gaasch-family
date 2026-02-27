import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string; id: string }> };

// DELETE — revoke a pending invite (admin only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { treeId, id } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const invite = await prisma.treeInvite.findFirst({
    where: { id, treeId: tree.id },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  await prisma.treeInvite.delete({ where: { id: invite.id } });

  return new NextResponse(null, { status: 204 });
}
