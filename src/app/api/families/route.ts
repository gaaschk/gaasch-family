import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0);

  const [data, total] = await Promise.all([
    prisma.family.findMany({
      take: limit,
      skip: offset,
      include: { husband: true, wife: true },
      orderBy: { id: 'asc' },
    }),
    prisma.family.count(),
  ]);

  return NextResponse.json({ data, total, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('editor');
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();

  const family = await prisma.family.create({
    data: {
      id:        body.id,
      husbId:    body.husbId    ?? null,
      wifeId:    body.wifeId    ?? null,
      marrDate:  body.marrDate  ?? null,
      marrPlace: body.marrPlace ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tableName: 'families',
      recordId:  family.id,
      action:    'create',
      oldData:   null,
      newData:   JSON.stringify(family),
      userId:    auth.userId,
    },
  });

  return NextResponse.json(family, { status: 201 });
}
