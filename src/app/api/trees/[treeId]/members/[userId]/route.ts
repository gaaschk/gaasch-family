import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string; userId: string }> };

// PATCH — update a member's role (admin only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { treeId, userId } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  if (auth.userId === userId) {
    return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
  }

  if (tree.ownerId === userId) {
    return NextResponse.json({ error: 'You cannot change the role of the tree owner' }, { status: 400 });
  }

  const body = await req.json();
  const { role } = body as { role?: string };

  const validRoles = ['viewer', 'editor', 'admin'];
  if (!role || !validRoles.includes(role)) {
    return NextResponse.json(
      { error: 'role must be one of: viewer, editor, admin' },
      { status: 400 },
    );
  }

  const existing = await prisma.treeMember.findUnique({
    where: { treeId_userId: { treeId: tree.id, userId } },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const updated = await prisma.treeMember.update({
    where: { treeId_userId: { treeId: tree.id, userId } },
    data: { role },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE — remove a member from the tree (admin only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { treeId, userId } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  if (auth.userId === userId) {
    return NextResponse.json({ error: 'You cannot remove yourself from the tree' }, { status: 400 });
  }

  if (tree.ownerId === userId) {
    return NextResponse.json({ error: 'You cannot remove the tree owner' }, { status: 400 });
  }

  const existing = await prisma.treeMember.findUnique({
    where: { treeId_userId: { treeId: tree.id, userId } },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  await prisma.treeMember.delete({
    where: { treeId_userId: { treeId: tree.id, userId } },
  });

  return new NextResponse(null, { status: 204 });
}
