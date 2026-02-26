import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const KEVIN_ID = '@I500001@';

type PathEntry = { id: string; name: string; birthDate: string | null; deathDate: string | null };

/**
 * BFS backwards from Kevin through parent relationships to find the shortest
 * ancestral path from `targetId` down to Kevin.
 * Returns [] if the person is not an ancestor of Kevin.
 */
async function computePathToKevin(targetId: string): Promise<PathEntry[]> {
  // Load the entire family graph (tiny tables — ~300 families, ~1500 child rows)
  const [families, familyChildren] = await Promise.all([
    prisma.family.findMany({ select: { id: true, husbId: true, wifeId: true } }),
    prisma.familyChild.findMany({ select: { familyId: true, personId: true } }),
  ]);

  // Build child → [parent, ...] map
  const famMap = new Map(families.map(f => [f.id, f]));
  const childToParents = new Map<string, string[]>();
  for (const fc of familyChildren) {
    const fam = famMap.get(fc.familyId);
    if (!fam) continue;
    const parents: string[] = [];
    if (fam.husbId) parents.push(fam.husbId);
    if (fam.wifeId) parents.push(fam.wifeId);
    if (!childToParents.has(fc.personId)) childToParents.set(fc.personId, []);
    childToParents.get(fc.personId)!.push(...parents);
  }

  // BFS from Kevin backwards; cameFrom[x] = child of x on the path toward Kevin
  const cameFrom = new Map<string, string | null>([[KEVIN_ID, null]]);
  const queue: string[] = [KEVIN_ID];
  let found = targetId === KEVIN_ID;

  outer: while (queue.length > 0 && !found) {
    const current = queue.shift()!;
    for (const parentId of childToParents.get(current) ?? []) {
      if (!cameFrom.has(parentId)) {
        cameFrom.set(parentId, current);
        if (parentId === targetId) { found = true; break outer; }
        queue.push(parentId);
      }
    }
  }

  if (!found) return [];

  // Reconstruct path: targetId → ... → Kevin
  const pathIds: string[] = [];
  let cur: string | null = targetId;
  while (cur !== null) {
    pathIds.push(cur);
    const next = cameFrom.get(cur);
    cur = next === undefined ? null : next;
  }

  // Fetch display data for each node in the path
  const people = await prisma.person.findMany({
    where: { id: { in: pathIds } },
    select: { id: true, name: true, birthDate: true, deathDate: true },
  });
  const personMap = new Map(people.map(p => [p.id, p]));
  return pathIds.map(id => personMap.get(id)).filter((p): p is PathEntry => p !== undefined);
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireRole('viewer');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const [person, pathToKevin] = await Promise.all([
    prisma.person.findUnique({
      where: { id },
      include: {
        childIn: {
          include: {
            family: { include: { husband: true, wife: true } },
          },
        },
        asHusband: {
          include: { wife: true, children: { include: { person: true } } },
        },
        asWife: {
          include: { husband: true, children: { include: { person: true } } },
        },
      },
    }),
    computePathToKevin(id),
  ]);

  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  return NextResponse.json({ ...person, pathToKevin });
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
    occupation, notes, narrative,
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
      ...(narrative   !== undefined && { narrative }),
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
