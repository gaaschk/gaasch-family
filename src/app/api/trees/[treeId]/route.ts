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

  const { tree } = auth;

  const body = (await req.json()) as { name?: string; description?: string };

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
