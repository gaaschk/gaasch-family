import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string; id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { treeId, id } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const family = await prisma.family.findFirst({
    where: { id, treeId: tree.id },
    include: {
      husband:  true,
      wife:     true,
      children: { include: { person: true } },
    },
  });

  if (!family) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  return NextResponse.json(family);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { treeId, id } = await params;

  const auth = await requireTreeAccess(treeId, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { userId, tree } = auth;

  const existing = await prisma.family.findFirst({ where: { id, treeId: tree.id } });
  if (!existing) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  const body = (await req.json()) as {
    husbId?:    string | null;
    wifeId?:    string | null;
    marrDate?:  string | null;
    marrPlace?: string | null;
  };

  const family = await prisma.family.update({
    where: { id },
    data: {
      ...(body.husbId    !== undefined && { husbId:    body.husbId }),
      ...(body.wifeId    !== undefined && { wifeId:    body.wifeId }),
      ...(body.marrDate  !== undefined && { marrDate:  body.marrDate }),
      ...(body.marrPlace !== undefined && { marrPlace: body.marrPlace }),
    },
  });

  await prisma.auditLog.create({
    data: {
      tableName: 'families',
      recordId:  id,
      action:    'update',
      oldData:   JSON.stringify(existing),
      newData:   JSON.stringify(family),
      treeId:    tree.id,
      userId,
    },
  });

  return NextResponse.json(family);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { treeId, id } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { userId, tree } = auth;

  const existing = await prisma.family.findFirst({ where: { id, treeId: tree.id } });
  if (!existing) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  await prisma.family.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tableName: 'families',
      recordId:  id,
      action:    'delete',
      oldData:   JSON.stringify(existing),
      newData:   null,
      treeId:    tree.id,
      userId,
    },
  });

  return new NextResponse(null, { status: 204 });
}
