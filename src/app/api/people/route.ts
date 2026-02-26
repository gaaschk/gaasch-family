import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q       = searchParams.get('q')       ?? '';
  const place   = searchParams.get('place')   ?? '';
  const surname = searchParams.get('surname') ?? '';
  const all     = searchParams.get('all')     === 'true';
  const limit   = all ? undefined : Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 2000);
  const offset  = all ? undefined : Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0);

  const conditions: object[] = [];

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
        { birthPlace: { contains: place } },
        { deathPlace: { contains: place } },
        { burialPlace: { contains: place } },
      ],
    });
  }

  // Surnames in GEDCOM format are wrapped in slashes: "Jean /Gaasch/"
  if (surname) {
    conditions.push({ name: { contains: `/${surname}/` } });
  }

  const where = conditions.length === 0 ? undefined
    : conditions.length === 1 ? conditions[0]
    : { AND: conditions };

  const [data, total] = await Promise.all([
    prisma.person.findMany({ where, take: limit, skip: offset, orderBy: { name: 'asc' } }),
    prisma.person.count({ where }),
  ]);

  return NextResponse.json({ data, total, limit: limit ?? total, offset: offset ?? 0 });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('editor');
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();

  const person = await prisma.person.create({
    data: {
      id:          body.id,
      name:        body.name,
      sex:         body.sex         ?? null,
      birthDate:   body.birthDate   ?? null,
      birthPlace:  body.birthPlace  ?? null,
      deathDate:   body.deathDate   ?? null,
      deathPlace:  body.deathPlace  ?? null,
      burialPlace: body.burialPlace ?? null,
      burialDate:  body.burialDate  ?? null,
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
      userId:    auth.userId,
    },
  });

  return NextResponse.json(person, { status: 201 });
}
