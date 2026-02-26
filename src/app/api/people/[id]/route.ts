import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      childIn: {
        include: {
          family: {
            include: { husband: true, wife: true },
          },
        },
      },
      asHusband: {
        include: { wife: true, children: { include: { person: true } } },
      },
      asWife: {
        include: { husband: true, children: { include: { person: true } } },
      },
    },
  });

  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  return NextResponse.json(person);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole('editor');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.person.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  const {
    name, sex, birthDate, birthPlace,
    deathDate, deathPlace, burialPlace, burialDate,
    occupation, notes,
  } = body;

  const person = await prisma.person.update({
    where: { id },
    data: {
      ...(name        !== undefined && { name }),
      ...(sex         !== undefined && { sex }),
      ...(birthDate   !== undefined && { birthDate }),
      ...(birthPlace  !== undefined && { birthPlace }),
      ...(deathDate   !== undefined && { deathDate }),
      ...(deathPlace  !== undefined && { deathPlace }),
      ...(burialPlace !== undefined && { burialPlace }),
      ...(burialDate  !== undefined && { burialDate }),
      ...(occupation  !== undefined && { occupation }),
      ...(notes       !== undefined && { notes }),
    },
  });

  await prisma.auditLog.create({
    data: {
      tableName: 'people',
      recordId:  id,
      action:    'update',
      oldData:   JSON.stringify(existing),
      newData:   JSON.stringify(person),
      userId:    auth.userId,
    },
  });

  return NextResponse.json(person);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireRole('admin');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const existing = await prisma.person.findUnique({ where: { id } });
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
      userId:    auth.userId,
    },
  });

  return new NextResponse(null, { status: 204 });
}
