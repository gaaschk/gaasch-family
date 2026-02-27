import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ token: string }> };

// POST — accept a tree invite using the token in the URL
export async function POST(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  // Any authenticated user can accept an invite
  const auth = await requireRole('viewer');
  if (auth instanceof NextResponse) return auth;

  const invite = await prisma.treeInvite.findUnique({ where: { token } });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  if (invite.acceptedAt !== null) {
    return NextResponse.json({ error: 'Invite has already been accepted' }, { status: 400 });
  }

  if (invite.expiresAt <= new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 400 });
  }

  // Verify the authenticated user's email matches the invite
  if (auth.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'This invite was sent to a different email address' },
      { status: 403 },
    );
  }

  // Check if already a member
  const existingMember = await prisma.treeMember.findUnique({
    where: { treeId_userId: { treeId: invite.treeId, userId: auth.userId } },
  });

  if (existingMember) {
    return NextResponse.json(
      { error: 'You are already a member of this tree' },
      { status: 409 },
    );
  }

  // Create the membership and mark the invite as accepted
  await prisma.$transaction([
    prisma.treeMember.create({
      data: {
        treeId: invite.treeId,
        userId: auth.userId,
        role:   invite.role,
      },
    }),
    prisma.treeInvite.update({
      where: { token },
      data:  { acceptedAt: new Date() },
    }),
  ]);

  // Look up the tree slug so the client can redirect
  const tree = await prisma.tree.findUnique({
    where:  { id: invite.treeId },
    select: { slug: true },
  });

  return NextResponse.json({ treeSlug: tree?.slug ?? null });
}
