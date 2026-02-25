import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      childIn: {
        include: {
          family: {
            include: {
              husband: true,
              wife: true,
            },
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
  // TODO: add auth check (editor/admin role required)
  const { id } = await params;
  const body = await req.json();

  // Only allow updating known safe fields
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

  return NextResponse.json(person);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  // TODO: add auth check (admin role required)
  const { id } = await params;

  await prisma.person.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
