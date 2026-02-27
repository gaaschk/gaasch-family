import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── GEDCOM Parser ─────────────────────────────────────────────────────────────

interface PersonRecord {
  id: string;
  name: string;
  sex: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  burialDate: string | null;
  burialPlace: string | null;
  occupation: string | null;
  notes: string | null;
}

interface FamilyRecord {
  id: string;
  husbId: string | null;
  wifeId: string | null;
  marrDate: string | null;
  marrPlace: string | null;
  children: string[];
}

function parseIndi(id: string, lines: string[]): PersonRecord {
  const rec: PersonRecord = {
    id, name: '', sex: null, birthDate: null, birthPlace: null,
    deathDate: null, deathPlace: null, burialDate: null, burialPlace: null,
    occupation: null, notes: null,
  };
  let ctx = '';
  for (const line of lines) {
    const sp = line.indexOf(' ');
    if (sp === -1) continue;
    const level = parseInt(line.slice(0, sp));
    const rest  = line.slice(sp + 1);
    const te    = rest.indexOf(' ');
    const tag   = te === -1 ? rest : rest.slice(0, te);
    const val   = te === -1 ? '' : rest.slice(te + 1);
    if (level === 1) {
      ctx = tag;
      if (tag === 'NAME') rec.name = val;
      else if (tag === 'SEX')  rec.sex = val || null;
      else if (tag === 'OCCU') rec.occupation = val || null;
      else if (tag === 'NOTE') rec.notes = val || null;
    } else if (level === 2) {
      switch (ctx) {
        case 'BIRT':
          if (tag === 'DATE') rec.birthDate  = val || null;
          if (tag === 'PLAC') rec.birthPlace = val || null;
          break;
        case 'DEAT':
          if (tag === 'DATE') rec.deathDate  = val || null;
          if (tag === 'PLAC') rec.deathPlace = val || null;
          break;
        case 'BURI':
          if (tag === 'DATE') rec.burialDate  = val || null;
          if (tag === 'PLAC') rec.burialPlace = val || null;
          break;
        case 'NOTE':
          if (tag === 'CONT') rec.notes = (rec.notes ?? '') + '\n' + val;
          if (tag === 'CONC') rec.notes = (rec.notes ?? '') + val;
          break;
      }
    }
  }
  return rec;
}

function parseFam(id: string, lines: string[]): FamilyRecord {
  const rec: FamilyRecord = { id, husbId: null, wifeId: null, marrDate: null, marrPlace: null, children: [] };
  let ctx = '';
  for (const line of lines) {
    const sp = line.indexOf(' ');
    if (sp === -1) continue;
    const level = parseInt(line.slice(0, sp));
    const rest  = line.slice(sp + 1);
    const te    = rest.indexOf(' ');
    const tag   = te === -1 ? rest : rest.slice(0, te);
    const val   = te === -1 ? '' : rest.slice(te + 1);
    if (level === 1) {
      ctx = tag;
      if (tag === 'HUSB') rec.husbId = val || null;
      else if (tag === 'WIFE') rec.wifeId = val || null;
      else if (tag === 'CHIL' && val) rec.children.push(val);
    } else if (level === 2 && ctx === 'MARR') {
      if (tag === 'DATE') rec.marrDate  = val || null;
      if (tag === 'PLAC') rec.marrPlace = val || null;
    }
  }
  return rec;
}

function parseGedcom(text: string): { people: PersonRecord[]; families: FamilyRecord[] } {
  const lines   = text.split(/\r?\n/);
  const people: PersonRecord[]   = [];
  const families: FamilyRecord[] = [];
  let recLines: string[] = [];
  let recId:  string | null = null;
  let recTag: string | null = null;

  function flush() {
    if (!recId || !recTag) return;
    if (recTag === 'INDI') people.push(parseIndi(recId, recLines));
    else if (recTag === 'FAM') families.push(parseFam(recId, recLines));
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('0 ')) {
      flush();
      recLines = [];
      const parts = line.split(/\s+/);
      if (parts[1]?.startsWith('@') && parts[1]?.endsWith('@')) {
        recId  = parts[1];
        recTag = parts[2] ?? null;
      } else {
        recId = recTag = null;
      }
    } else {
      recLines.push(line);
    }
  }
  flush();
  return { people, families };
}

// ── Route handler ─────────────────────────────────────────────────────────────

type Params = { params: Promise<{ treeId: string }> };

const BATCH = 50;

export async function POST(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const text = await file.text();
  const { people, families } = parseGedcom(text);

  if (people.length === 0 && families.length === 0) {
    return NextResponse.json({ error: 'No INDI or FAM records found in file' }, { status: 400 });
  }

  // 1. Upsert people — narrative is NOT in the update block, so it is preserved.
  //    Use the composite (treeId, gedcomId) unique key so re-importing the same GEDCOM
  //    into a different tree never collides with another tree's records.
  for (let i = 0; i < people.length; i += BATCH) {
    const batch = people.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map(p =>
        prisma.person.upsert({
          where: { treeId_gedcomId: { treeId: tree.id, gedcomId: p.id } },
          create: {
            treeId: tree.id, gedcomId: p.id,
            name: p.name, sex: p.sex,
            birthDate: p.birthDate, birthPlace: p.birthPlace,
            deathDate: p.deathDate, deathPlace: p.deathPlace,
            burialDate: p.burialDate, burialPlace: p.burialPlace,
            occupation: p.occupation, notes: p.notes,
            narrative: null,
          },
          update: {
            name: p.name, sex: p.sex,
            birthDate: p.birthDate, birthPlace: p.birthPlace,
            deathDate: p.deathDate, deathPlace: p.deathPlace,
            burialDate: p.burialDate, burialPlace: p.burialPlace,
            occupation: p.occupation, notes: p.notes,
            // narrative intentionally omitted — preserves existing value
          },
        })
      )
    );
  }

  // Build gedcomId → DB person id map so family spouse FKs use real CUIDs
  const personRows = await prisma.person.findMany({
    where: { treeId: tree.id, gedcomId: { in: people.map(p => p.id) } },
    select: { id: true, gedcomId: true },
  });
  const gedcomIdMap = new Map(personRows.map(p => [p.gedcomId!, p.id]));

  // 2. Upsert families — resolve husband/wife gedcomIds to DB person CUIDs
  for (let i = 0; i < families.length; i += BATCH) {
    const batch = families.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map(f => {
        const husbId = f.husbId ? (gedcomIdMap.get(f.husbId) ?? null) : null;
        const wifeId = f.wifeId ? (gedcomIdMap.get(f.wifeId) ?? null) : null;
        return prisma.family.upsert({
          where: { treeId_gedcomId: { treeId: tree.id, gedcomId: f.id } },
          create: {
            treeId: tree.id, gedcomId: f.id,
            husbId, wifeId,
            marrDate: f.marrDate, marrPlace: f.marrPlace,
          },
          update: {
            husbId, wifeId,
            marrDate: f.marrDate, marrPlace: f.marrPlace,
          },
        });
      })
    );
  }

  // 3. Sync family children — delete + recreate per family so removals are handled.
  //    Look up the actual Person.id for each gedcomId within this tree.
  for (const family of families) {
    // Resolve the DB family record to get its actual id
    const dbFamily = await prisma.family.findFirst({
      where: { treeId: tree.id, gedcomId: family.id },
      select: { id: true },
    });
    if (!dbFamily) continue;

    const childPersonIds = await Promise.all(
      family.children.map(gedId =>
        prisma.person.findFirst({
          where: { treeId: tree.id, gedcomId: gedId },
          select: { id: true },
        })
      )
    );
    const validChildIds = childPersonIds.filter(Boolean).map(p => p!.id);

    await prisma.$transaction([
      prisma.familyChild.deleteMany({ where: { familyId: dbFamily.id } }),
      ...validChildIds.map(personId =>
        prisma.familyChild.create({ data: { familyId: dbFamily.id, personId } })
      ),
    ]);
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      tableName: 'import',
      recordId:  'gedcom',
      action:    'import',
      oldData:   null,
      newData:   JSON.stringify({ filename: file.name, people: people.length, families: families.length }),
      treeId:    tree.id,
      userId:    auth.userId,
    },
  });

  return NextResponse.json({ ok: true, imported: { people: people.length, families: families.length } });
}
