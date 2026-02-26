import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireRole('viewer');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const family = await prisma.family.findUnique({
    where: { id },
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
  const auth = await requireRole('editor');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.family.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  const { husbId, wifeId, marrDate, marrPlace } = body;

  const family = await prisma.family.update({
    where: { id },
    data: {
      ...(husbId    !== undefined && { husbId }),
      ...(wifeId    !== undefined && { wifeId }),
      ...(marrDate  !== undefined && { marrDate }),
      ...(marrPlace !== undefined && { marrPlace }),
    },
  });

  await prisma.auditLog.create({
    data: {
      tableName: 'families',
      recordId:  id,
      action:    'update',
      oldData:   JSON.stringify(existing),
      newData:   JSON.stringify(family),
      userId:    auth.userId,
    },
  });

  return NextResponse.json(family);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireRole('admin');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const existing = await prisma.family.findUnique({ where: { id } });
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
      userId:    auth.userId,
    },
  });

  return new NextResponse(null, { status: 204 });
}
