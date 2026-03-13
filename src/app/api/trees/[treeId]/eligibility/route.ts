import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';
import { checkEligibility, type AncestorInfo } from '@/lib/eligibility';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  // Load all people and families for this tree
  const [people, families, familyChildren, defaultPersonSetting] = await Promise.all([
    prisma.person.findMany({
      where: { treeId: tree.id },
      select: { id: true, name: true, sex: true, birthPlace: true, birthDate: true, deathDate: true },
    }),
    prisma.family.findMany({
      where: { treeId: tree.id },
      select: { id: true, husbId: true, wifeId: true },
    }),
    prisma.familyChild.findMany({
      where: { family: { treeId: tree.id } },
      select: { familyId: true, personId: true },
    }),
    prisma.setting.findFirst({
      where: { treeId: tree.id, key: 'default_person_id' },
      select: { value: true },
    }),
  ]);

  // Build parent lookup: childId -> [parentId, ...]
  const familyMap = new Map(families.map(f => [f.id, f]));
  const childToParents = new Map<string, string[]>();

  for (const fc of familyChildren) {
    const family = familyMap.get(fc.familyId);
    if (!family) continue;
    const parents: string[] = [];
    if (family.husbId) parents.push(family.husbId);
    if (family.wifeId) parents.push(family.wifeId);
    childToParents.set(fc.personId, parents);
  }

  // Determine root person
  const rootId = defaultPersonSetting?.value ?? people[0]?.id;
  if (!rootId) {
    return NextResponse.json({ results: [] });
  }

  // BFS upward from root to assign generations
  const personMap = new Map(people.map(p => [p.id, p]));
  const generationMap = new Map<string, number>();
  generationMap.set(rootId, 0);

  const queue: { id: string; gen: number }[] = [{ id: rootId, gen: 0 }];
  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    const parents = childToParents.get(id);
    if (!parents) continue;
    for (const parentId of parents) {
      if (generationMap.has(parentId)) continue;
      generationMap.set(parentId, gen + 1);
      queue.push({ id: parentId, gen: gen + 1 });
    }
  }

  // Build ancestor list
  const ancestors: AncestorInfo[] = people.map(p => ({
    id: p.id,
    name: p.name,
    sex: p.sex,
    birthPlace: p.birthPlace,
    birthDate: p.birthDate,
    deathDate: p.deathDate,
    generation: generationMap.get(p.id) ?? 99,
  }));

  const results = checkEligibility(ancestors);

  return NextResponse.json({ results, rootPersonId: rootId, totalPeople: people.length });
}
