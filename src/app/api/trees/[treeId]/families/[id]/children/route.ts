import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string; id: string }> };

/** PATCH /api/trees/[treeId]/families/[id]/children
 *  Body: { add?: string[], remove?: string[] }  — person IDs
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { treeId, id: familyId } = await params;

  const auth = await requireTreeAccess(treeId, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const family = await prisma.family.findFirst({ where: { id: familyId, treeId: tree.id } });
  if (!family) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  const body = (await req.json()) as { add?: string[]; remove?: string[] };

  const adds    = body.add    ?? [];
  const removes = body.remove ?? [];

  await prisma.$transaction([
    ...adds.map((personId) =>
      prisma.familyChild.upsert({
        where:  { familyId_personId: { familyId, personId } },
        create: { familyId, personId },
        update: {},
      }),
    ),
    ...removes.map((personId) =>
      prisma.familyChild.deleteMany({
        where: { familyId, personId },
      }),
    ),
  ]);

  const updated = await prisma.family.findUnique({
    where:   { id: familyId },
    include: { children: { include: { person: true } } },
  });

  return NextResponse.json(updated);
}
