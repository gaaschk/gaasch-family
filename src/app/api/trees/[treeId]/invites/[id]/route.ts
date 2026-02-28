import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';
import { sendTreeInviteEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string; id: string }> };

// POST — resend a pending invite (admin only): reset expiry + resend email
export async function POST(_req: NextRequest, { params }: Params) {
  const { treeId, id } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const invite = await prisma.treeInvite.findFirst({
    where: { id, treeId: tree.id, acceptedAt: null },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const updated = await prisma.treeInvite.update({
    where: { id: invite.id },
    data: { expiresAt },
  });

  sendTreeInviteEmail(invite.email, {
    treeName:     tree.name,
    role:         invite.role,
    token:        invite.token,
    inviterEmail: auth.email,
  }).catch((err) => {
    console.error('[resend invite email]', err);
  });

  return NextResponse.json({ ok: true, expiresAt: updated.expiresAt });
}

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
