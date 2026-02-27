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

  const person = await prisma.person.findFirst({
    where: { id, treeId: tree.id },
    include: {
      childIn: {
        include: {
          family: { include: { husband: true, wife: true } },
        },
      },
      asHusband: {
        include: {
          wife:     true,
          children: { include: { person: true } },
        },
      },
      asWife: {
        include: {
          husband:  true,
          children: { include: { person: true } },
        },
      },
    },
  });

  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  return NextResponse.json(person);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { treeId, id } = await params;

  const auth = await requireTreeAccess(treeId, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { userId, tree } = auth;

  const existing = await prisma.person.findFirst({ where: { id, treeId: tree.id } });
  if (!existing) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  const body = (await req.json()) as {
    name?:        string;
    sex?:         string | null;
    birthDate?:   string | null;
    birthPlace?:  string | null;
    deathDate?:   string | null;
    deathPlace?:  string | null;
    burialPlace?: string | null;
    burialDate?:  string | null;
    occupation?:  string | null;
    notes?:       string | null;
    narrative?:   string | null;
  };

  const person = await prisma.person.update({
    where: { id },
    data: {
      ...(body.name        !== undefined && { name:        body.name }),
      ...(body.sex         !== undefined && { sex:         body.sex }),
      ...(body.birthDate   !== undefined && { birthDate:   body.birthDate }),
      ...(body.birthPlace  !== undefined && { birthPlace:  body.birthPlace }),
      ...(body.deathDate   !== undefined && { deathDate:   body.deathDate }),
      ...(body.deathPlace  !== undefined && { deathPlace:  body.deathPlace }),
      ...(body.burialPlace !== undefined && { burialPlace: body.burialPlace }),
      ...(body.burialDate  !== undefined && { burialDate:  body.burialDate }),
      ...(body.occupation  !== undefined && { occupation:  body.occupation }),
      ...(body.notes       !== undefined && { notes:       body.notes }),
      ...(body.narrative   !== undefined && { narrative:   body.narrative }),
    },
  });

  await prisma.auditLog.create({
    data: {
      tableName: 'people',
      recordId:  id,
      action:    'update',
      oldData:   JSON.stringify(existing),
      newData:   JSON.stringify(person),
      treeId:    tree.id,
      userId,
    },
  });

  return NextResponse.json(person);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { treeId, id } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { userId, tree } = auth;

  const existing = await prisma.person.findFirst({ where: { id, treeId: tree.id } });
  if (!existing) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  await prisma.person.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tableName: 'people',
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
