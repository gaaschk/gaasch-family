import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const [memberCount, personCount, familyCount] = await Promise.all([
    prisma.treeMember.count({ where: { treeId: tree.id } }),
    prisma.person.count({ where: { treeId: tree.id } }),
    prisma.family.count({ where: { treeId: tree.id } }),
  ]);

  const fullTree = await prisma.tree.findUnique({ where: { id: tree.id } });

  return NextResponse.json({ ...fullTree, memberCount, personCount, familyCount });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { tree, userId } = auth;

  const body = (await req.json()) as { name?: string; description?: string; newOwnerId?: string };

  // Ownership transfer — only the current owner may do this
  if (body.newOwnerId !== undefined) {
    if (userId !== tree.ownerId) {
      return NextResponse.json(
        { error: 'Only the current owner can transfer ownership' },
        { status: 403 },
      );
    }

    if (body.newOwnerId === userId) {
      return NextResponse.json({ error: 'Already the owner' }, { status: 400 });
    }

    const newOwnerMember = await prisma.treeMember.findUnique({
      where: { treeId_userId: { treeId: tree.id, userId: body.newOwnerId } },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!newOwnerMember) {
      return NextResponse.json(
        { error: 'New owner must already be a member of this tree' },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.tree.update({ where: { id: tree.id }, data: { ownerId: body.newOwnerId } });
      // Keep previous owner as an admin member so they retain access
      await tx.treeMember.upsert({
        where:  { treeId_userId: { treeId: tree.id, userId } },
        update: { role: 'admin' },
        create: { treeId: tree.id, userId, role: 'admin' },
      });
    });

    return NextResponse.json({ ok: true });
  }

  const updated = await prisma.tree.update({
    where: { id: tree.id },
    data: {
      ...(body.name        !== undefined && { name:        body.name.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() ?? null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { userId, tree } = auth;

  if (tree.ownerId !== userId) {
    return NextResponse.json(
      { error: 'Only the tree owner can delete a tree' },
      { status: 403 },
    );
  }

  await prisma.tree.delete({ where: { id: tree.id } });

  return new NextResponse(null, { status: 204 });
}
