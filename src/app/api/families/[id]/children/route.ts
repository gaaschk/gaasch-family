import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/families/[id]/children — body: { add?: string[], remove?: string[] } */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole('editor');
  if (auth instanceof NextResponse) return auth;

  const { id: familyId } = await params;
  const body: { add?: string[]; remove?: string[] } = await req.json();

  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  const adds    = body.add    ?? [];
  const removes = body.remove ?? [];

  await prisma.$transaction([
    ...adds.map(personId =>
      prisma.familyChild.upsert({
        where:  { familyId_personId: { familyId, personId } },
        create: { familyId, personId },
        update: {},
      }),
    ),
    ...removes.map(personId =>
      prisma.familyChild.deleteMany({
        where: { familyId, personId },
      }),
    ),
  ]);

  const updated = await prisma.family.findUnique({
    where: { id: familyId },
    include: { children: { include: { person: true } } },
  });

  return NextResponse.json(updated);
}
