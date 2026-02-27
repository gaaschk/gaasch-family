import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';
import { sendTreeInviteEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string }> };

// GET — list all members; also returns pending invites for admin/editor
export async function GET(_req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { tree, treeRole } = auth;

  const members = await prisma.treeMember.findMany({
    where: { treeId: tree.id },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
    },
    orderBy: { joinedAt: 'asc' },
  });

  const canSeeInvites = treeRole === 'admin' || treeRole === 'editor';
  const invites = canSeeInvites
    ? await prisma.treeInvite.findMany({
        where: {
          treeId: tree.id,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  return NextResponse.json({ members, invites, isOwner: auth.userId === tree.ownerId });
}

// POST — invite or directly add a member to the tree (admin only)
export async function POST(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const body = await req.json();
  const { email, role } = body as { email?: string; role?: string };

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const validRoles = ['viewer', 'editor', 'admin'];
  if (!role || !validRoles.includes(role)) {
    return NextResponse.json(
      { error: 'role must be one of: viewer, editor, admin' },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    // Check if already a member
    const existingMember = await prisma.treeMember.findUnique({
      where: { treeId_userId: { treeId: tree.id, userId: existingUser.id } },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this tree' },
        { status: 409 },
      );
    }

    // Also check if they are the tree owner (implicitly already admin)
    if (existingUser.id === tree.ownerId) {
      return NextResponse.json(
        { error: 'User is the tree owner and already has admin access' },
        { status: 409 },
      );
    }

    // User exists but is not a member — add directly
    await prisma.treeMember.create({
      data: { treeId: tree.id, userId: existingUser.id, role },
    });

    return NextResponse.json({ ok: true, directlyAdded: true, invited: false });
  }

  // No account exists — create an invite
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.treeInvite.create({
    data: {
      treeId:    tree.id,
      email,
      role,
      invitedBy: auth.userId,
      expiresAt,
    },
  });

  // Send invite email (non-blocking — do not fail the request if email fails)
  sendTreeInviteEmail(email, {
    treeName:     tree.name,
    role,
    token:        invite.token,
    inviterEmail: auth.email,
  }).catch((err) => {
    console.error('[invite email]', err);
  });

  return NextResponse.json({ ok: true, invited: true, directlyAdded: false });
}
