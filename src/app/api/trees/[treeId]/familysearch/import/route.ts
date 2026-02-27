/**
 * POST /api/trees/[treeId]/familysearch/import
 * Body: { pid: string, generations?: number }
 *
 * Fetches the person + their ancestors up to `generations` levels,
 * creates Person/Family records in our tree.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireTreeAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getAccessToken,
  fetchAncestry,
  fetchParentRelationships,
  fetchSpouseRelationships,
  fsGet,
  mapFsPerson,
  type FsPersonSummary,
} from '@/lib/familysearch';

export const dynamic   = 'force-dynamic';
export const maxDuration = 60;

type Params = { params: Promise<{ treeId: string }> };

function fsPidToGedcomId(pid: string) { return `FS:${pid}`; }

async function upsertPerson(treeId: string, p: FsPersonSummary) {
  const gedcomId = fsPidToGedcomId(p.pid);
  return prisma.person.upsert({
    where:  { treeId_gedcomId: { treeId, gedcomId } },
    update: {
      // Only update fields that FamilySearch provides (never overwrite locally-added narrative)
      name:        p.name,
      sex:         p.sex,
      birthDate:   p.birthDate,
      birthPlace:  p.birthPlace,
      deathDate:   p.deathDate,
      deathPlace:  p.deathPlace,
      burialDate:  p.burialDate,
      burialPlace: p.burialPlace,
      occupation:  p.occupation,
    },
    create: {
      treeId,
      gedcomId,
      name:        p.name,
      sex:         p.sex,
      birthDate:   p.birthDate,
      birthPlace:  p.birthPlace,
      deathDate:   p.deathDate,
      deathPlace:  p.deathPlace,
      burialDate:  p.burialDate,
      burialPlace: p.burialPlace,
      occupation:  p.occupation,
    },
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { userId, tree } = auth;

  const token = await getAccessToken(userId);
  if (!token) {
    return NextResponse.json({ error: 'Not connected to FamilySearch' }, { status: 401 });
  }

  const body = (await req.json()) as { pid: string; generations?: number };
  const { pid, generations = 4 } = body;
  if (!pid) return NextResponse.json({ error: 'pid required' }, { status: 400 });

  const imported = { people: 0, families: 0 };

  try {
    // Fetch the full ancestry pedigree
    const ancestors = await fetchAncestry(token, pid, Math.min(generations, 6));

    // Upsert every person
    const personMap = new Map<string, string>(); // pid → our DB id
    for (const p of ancestors) {
      const record = await upsertPerson(tree.id, p);
      personMap.set(p.pid, record.id);
      imported.people++;
    }

    // Build parent-child and spouse families for each person in the ancestry
    // We work through each person and their parents relationship
    const seenFamilies = new Set<string>();

    for (const p of ancestors) {
      const { fatherId, motherId } = await fetchParentRelationships(token, p.pid);
      if (!fatherId && !motherId) continue;

      // Ensure both parents are in our DB (they may not be in ancestry if at edge of tree)
      let fatherDbId: string | null = null;
      let motherDbId: string | null = null;

      if (fatherId) {
        if (!personMap.has(fatherId)) {
          try {
            const pd = await fsGet<{ persons?: unknown[] }>(`/platform/tree/persons/${fatherId}`, token);
            const fsP = (pd.persons as unknown[])?.[0];
            if (fsP) {
              const mapped = mapFsPerson(fsP as Parameters<typeof mapFsPerson>[0]);
              const rec = await upsertPerson(tree.id, mapped);
              personMap.set(fatherId, rec.id);
              imported.people++;
            }
          } catch { /* skip */ }
        }
        fatherDbId = personMap.get(fatherId) ?? null;
      }

      if (motherId) {
        if (!personMap.has(motherId)) {
          try {
            const pd = await fsGet<{ persons?: unknown[] }>(`/platform/tree/persons/${motherId}`, token);
            const fsP = (pd.persons as unknown[])?.[0];
            if (fsP) {
              const mapped = mapFsPerson(fsP as Parameters<typeof mapFsPerson>[0]);
              const rec = await upsertPerson(tree.id, mapped);
              personMap.set(motherId, rec.id);
              imported.people++;
            }
          } catch { /* skip */ }
        }
        motherDbId = personMap.get(motherId) ?? null;
      }

      const childDbId = personMap.get(p.pid);
      if (!childDbId) continue;

      // Build a stable family key
      const famKey = [fatherId ?? '', motherId ?? ''].sort().join(':');
      if (seenFamilies.has(famKey)) {
        // Family already created — just ensure child link exists
        const gedcomId = `FS:FAM:${famKey}`;
        const fam = await prisma.family.findFirst({ where: { treeId: tree.id, gedcomId } });
        if (fam) {
          await prisma.familyChild.upsert({
            where:  { familyId_personId: { familyId: fam.id, personId: childDbId } },
            update: {},
            create: { familyId: fam.id, personId: childDbId },
          });
        }
        continue;
      }
      seenFamilies.add(famKey);

      // Get marriage facts from spouse relationships if available
      let marrDate: string | null  = null;
      let marrPlace: string | null = null;
      if (fatherId && motherId) {
        const spouses = await fetchSpouseRelationships(token, fatherId);
        const marrRel = spouses.find(s => s.spouseId === motherId);
        if (marrRel) { marrDate = marrRel.marrDate; marrPlace = marrRel.marrPlace; }
      }

      const gedcomId = `FS:FAM:${famKey}`;
      const family = await prisma.family.upsert({
        where:  { treeId_gedcomId: { treeId: tree.id, gedcomId } },
        update: { husbId: fatherDbId, wifeId: motherDbId, marrDate, marrPlace },
        create: {
          treeId: tree.id,
          gedcomId,
          husbId: fatherDbId,
          wifeId: motherDbId,
          marrDate,
          marrPlace,
        },
      });
      imported.families++;

      await prisma.familyChild.upsert({
        where:  { familyId_personId: { familyId: family.id, personId: childDbId } },
        update: {},
        create: { familyId: family.id, personId: childDbId },
      });
    }

    return NextResponse.json({ imported });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 },
    );
  }
}
