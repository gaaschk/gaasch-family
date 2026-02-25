import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q      = searchParams.get('q') ?? '';
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0);

  const where = q
    ? { name: { contains: q, mode: 'insensitive' as const } }
    : undefined;

  const [data, total] = await Promise.all([
    prisma.person.findMany({ where, take: limit, skip: offset, orderBy: { name: 'asc' } }),
    prisma.person.count({ where }),
  ]);

  return NextResponse.json({ data, total, limit, offset });
}

export async function POST(req: NextRequest) {
  // TODO: add auth check (editor/admin role required)
  const body = await req.json();

  const person = await prisma.person.create({
    data: {
      id:          body.id,
      name:        body.name,
      sex:         body.sex        ?? null,
      birthDate:   body.birthDate  ?? null,
      birthPlace:  body.birthPlace ?? null,
      deathDate:   body.deathDate  ?? null,
      deathPlace:  body.deathPlace ?? null,
      burialPlace: body.burialPlace ?? null,
      burialDate:  body.burialDate  ?? null,
      occupation:  body.occupation  ?? null,
      notes:       body.notes       ?? null,
    },
  });

  return NextResponse.json(person, { status: 201 });
}
