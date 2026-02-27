import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string }> };

/** Generate a cuid-compatible ID for the intermediate migration schema
 *  where Person.id and Family.id have no @default(cuid()). */
function newCuid(): string {
  return 'c' + randomBytes(12).toString('hex');
}

export async function GET(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;
  const { searchParams } = req.nextUrl;

  const q       = searchParams.get('q')       ?? '';
  const place   = searchParams.get('place')   ?? '';
  const surname = searchParams.get('surname') ?? '';
  const all     = searchParams.get('all')     === 'true';

  const limit  = all ? undefined : Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 2000);
  const offset = all ? undefined : Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0);

  // Always scope to this tree
  const treeCondition = { treeId: tree.id };
  const conditions: object[] = [treeCondition];

  if (q) {
    conditions.push({
      OR: [
        { name:       { contains: q } },
        { birthPlace: { contains: q } },
        { deathPlace: { contains: q } },
        { occupation: { contains: q } },
        { notes:      { contains: q } },
      ],
    });
  }

  if (place) {
    conditions.push({
      OR: [
        { birthPlace:  { contains: place } },
        { deathPlace:  { contains: place } },
        { burialPlace: { contains: place } },
      ],
    });
  }

  // Surnames in GEDCOM format are wrapped in slashes: "Jean /Gaasch/"
  if (surname) {
    conditions.push({ name: { contains: `/${surname}/` } });
  }

  const where = conditions.length === 1 ? conditions[0] : { AND: conditions };

  const [data, total] = await Promise.all([
    prisma.person.findMany({
      where,
      take:    limit,
      skip:    offset,
      orderBy: { name: 'asc' },
    }),
    prisma.person.count({ where }),
  ]);

  return NextResponse.json({ data, total, limit: limit ?? total, offset: offset ?? 0 });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { userId, tree } = auth;

  const body = (await req.json()) as {
    name:         string;
    sex?:         string | null;
    birthDate?:   string | null;
    birthPlace?:  string | null;
    deathDate?:   string | null;
    deathPlace?:  string | null;
    burialDate?:  string | null;
    burialPlace?: string | null;
    occupation?:  string | null;
    notes?:       string | null;
    narrative?:   string | null;
    gedcomId?:    string | null;
  };

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const person = await prisma.person.create({
    data: {
      id:          newCuid(),
      treeId:      tree.id,
      gedcomId:    body.gedcomId    ?? null,
      name:        body.name.trim(),
      sex:         body.sex         ?? null,
      birthDate:   body.birthDate   ?? null,
      birthPlace:  body.birthPlace  ?? null,
      deathDate:   body.deathDate   ?? null,
      deathPlace:  body.deathPlace  ?? null,
      burialDate:  body.burialDate  ?? null,
      burialPlace: body.burialPlace ?? null,
      occupation:  body.occupation  ?? null,
      notes:       body.notes       ?? null,
      narrative:   body.narrative   ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tableName: 'people',
      recordId:  person.id,
      action:    'create',
      oldData:   null,
      newData:   JSON.stringify(person),
      treeId:    tree.id,
      userId,
    },
  });

  return NextResponse.json(person, { status: 201 });
}
