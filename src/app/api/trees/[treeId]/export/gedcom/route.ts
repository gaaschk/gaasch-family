import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Params = { params: Promise<{ treeId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const [people, families, familyChildren] = await Promise.all([
    prisma.person.findMany({ where: { treeId: tree.id }, orderBy: { id: 'asc' } }),
    prisma.family.findMany({ where: { treeId: tree.id }, orderBy: { id: 'asc' } }),
    prisma.familyChild.findMany({
      where: { family: { treeId: tree.id } },
    }),
  ]);

  // Build gedcom ID lookup maps so HUSB/WIFE/CHIL/FAMC/FAMS references use the correct IDs
  const personGedId = new Map<string, string>(); // personId → gedcomId || id
  for (const p of people) {
    personGedId.set(p.id, p.gedcomId ?? p.id);
  }

  const familyGedId = new Map<string, string>(); // familyId → gedcomId || id
  for (const f of families) {
    familyGedId.set(f.id, f.gedcomId ?? f.id);
  }

  // Build famc / fams lookup maps (person → families they belong to)
  const famcMap = new Map<string, string[]>(); // personId → familyIds where child
  const famsMap = new Map<string, string[]>(); // personId → familyIds where spouse

  for (const fc of familyChildren) {
    if (!famcMap.has(fc.personId)) famcMap.set(fc.personId, []);
    famcMap.get(fc.personId)!.push(fc.familyId);
  }

  for (const f of families) {
    if (f.husbId) {
      if (!famsMap.has(f.husbId)) famsMap.set(f.husbId, []);
      famsMap.get(f.husbId)!.push(f.id);
    }
    if (f.wifeId) {
      if (!famsMap.has(f.wifeId)) famsMap.set(f.wifeId, []);
      famsMap.get(f.wifeId)!.push(f.id);
    }
  }

  // Build family → children map
  const familyChildrenMap = new Map<string, string[]>();
  for (const fc of familyChildren) {
    if (!familyChildrenMap.has(fc.familyId)) familyChildrenMap.set(fc.familyId, []);
    familyChildrenMap.get(fc.familyId)!.push(fc.personId);
  }

  const today = new Date();
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const gedDate = `${String(today.getDate()).padStart(2,'0')} ${months[today.getMonth()]} ${today.getFullYear()}`;

  const lines: string[] = [];

  lines.push('0 HEAD');
  lines.push('1 SOUR FamilyHistorySite');
  lines.push('2 NAME Family History');
  lines.push('2 VERS 2.0');
  lines.push(`1 DATE ${gedDate}`);
  lines.push(`1 FILE ${tree.slug}.ged`);
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  lines.push('1 LANG English');
  lines.push('1 SUBM @SUBM1@');
  lines.push('0 @SUBM1@ SUBM');
  lines.push(`1 NAME ${tree.name}`);

  for (const p of people) {
    const gedId = p.gedcomId ?? p.id;
    lines.push(`0 ${gedId} INDI`);
    if (p.name) lines.push(`1 NAME ${p.name}`);
    if (p.sex)  lines.push(`1 SEX ${p.sex}`);

    if (p.birthDate || p.birthPlace) {
      lines.push('1 BIRT');
      if (p.birthDate)  lines.push(`2 DATE ${p.birthDate}`);
      if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
    }

    if (p.deathDate || p.deathPlace) {
      lines.push('1 DEAT');
      if (p.deathDate)  lines.push(`2 DATE ${p.deathDate}`);
      if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`);
    }

    if (p.burialDate || p.burialPlace) {
      lines.push('1 BURI');
      if (p.burialDate)  lines.push(`2 DATE ${p.burialDate}`);
      if (p.burialPlace) lines.push(`2 PLAC ${p.burialPlace}`);
    }

    if (p.occupation) lines.push(`1 OCCU ${p.occupation}`);
    if (p.notes)      lines.push(`1 NOTE ${p.notes.replace(/\n/g, '\n2 CONT ')}`);

    for (const fid of (famcMap.get(p.id) ?? [])) {
      lines.push(`1 FAMC ${familyGedId.get(fid) ?? fid}`);
    }
    for (const fid of (famsMap.get(p.id) ?? [])) {
      lines.push(`1 FAMS ${familyGedId.get(fid) ?? fid}`);
    }
  }

  for (const f of families) {
    const gedId = f.gedcomId ?? f.id;
    lines.push(`0 ${gedId} FAM`);
    if (f.husbId) lines.push(`1 HUSB ${personGedId.get(f.husbId) ?? f.husbId}`);
    if (f.wifeId) lines.push(`1 WIFE ${personGedId.get(f.wifeId) ?? f.wifeId}`);

    for (const childPersonId of (familyChildrenMap.get(f.id) ?? [])) {
      lines.push(`1 CHIL ${personGedId.get(childPersonId) ?? childPersonId}`);
    }

    if (f.marrDate || f.marrPlace) {
      lines.push('1 MARR');
      if (f.marrDate)  lines.push(`2 DATE ${f.marrDate}`);
      if (f.marrPlace) lines.push(`2 PLAC ${f.marrPlace}`);
    }
  }

  lines.push('0 TRLR');

  const content = lines.join('\r\n');

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type':        'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tree.slug}.ged"`,
    },
  });
}
