import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string; id: string }> };

// BFS through family graph to find shortest path between two people
async function computePathToRoot(
  treeId: string,
  fromId: string,
  toId: string,
): Promise<Array<{ id: string; name: string }>> {
  if (fromId === toId) return [];

  const [families, familyChildren, allPeople] = await Promise.all([
    prisma.family.findMany({
      where: { treeId },
      select: { id: true, husbId: true, wifeId: true },
    }),
    prisma.familyChild.findMany({
      where: { family: { treeId } },
      select: { familyId: true, personId: true },
    }),
    prisma.person.findMany({
      where: { treeId },
      select: { id: true, name: true },
    }),
  ]);

  const nameMap = new Map(allPeople.map(p => [p.id, p.name]));

  const adj = new Map<string, string[]>();
  const addEdge = (a: string | null, b: string | null) => {
    if (!a || !b || a === b) return;
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  };

  const childrenByFamily = new Map<string, string[]>();
  for (const c of familyChildren) {
    const arr = childrenByFamily.get(c.familyId) ?? [];
    arr.push(c.personId);
    childrenByFamily.set(c.familyId, arr);
  }

  for (const f of families) {
    addEdge(f.husbId, f.wifeId);
    for (const childId of childrenByFamily.get(f.id) ?? []) {
      addEdge(f.husbId, childId);
      addEdge(f.wifeId, childId);
    }
  }

  if (!adj.has(fromId) || !adj.has(toId)) return [];

  const visited = new Set<string>([fromId]);
  const queue: string[][] = [[fromId]];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    if (current === toId) {
      return path.map(id => ({ id, name: nameMap.get(id) ?? '' }));
    }
    for (const neighbor of adj.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  return [];
}

export async function GET(req: NextRequest, { params }: Params) {
  const { treeId, id } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const [person, defaultPersonSetting] = await Promise.all([
    prisma.person.findFirst({
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
    }),
    prisma.setting.findFirst({
      where: { treeId: tree.id, key: 'default_person_id' },
      select: { value: true },
    }),
  ]);

  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  const rootPersonId = defaultPersonSetting?.value ?? null;
  const pathToRoot = rootPersonId && rootPersonId !== id
    ? await computePathToRoot(tree.id, id, rootPersonId)
    : [];

  return NextResponse.json({ ...person, pathToRoot });
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
