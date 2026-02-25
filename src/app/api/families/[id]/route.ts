import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
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
  // TODO: add auth check (editor/admin role required)
  const { id } = await params;
  const body = await req.json();

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

  return NextResponse.json(family);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  // TODO: add auth check (admin role required)
  const { id } = await params;

  await prisma.family.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
