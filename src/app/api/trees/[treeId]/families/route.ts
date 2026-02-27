import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string }> };

/** Generate a cuid-compatible ID for the intermediate migration schema
 *  where Family.id has no @default(cuid()). */
function newCuid(): string {
  return 'c' + randomBytes(12).toString('hex');
}

export async function GET(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;
  const { searchParams } = req.nextUrl;

  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0);

  const where = { treeId: tree.id };

  const [data, total] = await Promise.all([
    prisma.family.findMany({
      where,
      take:    limit,
      skip:    offset,
      include: { husband: true, wife: true },
      orderBy: { id: 'asc' },
    }),
    prisma.family.count({ where }),
  ]);

  return NextResponse.json({ data, total, limit, offset });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { userId, tree } = auth;

  const body = (await req.json()) as {
    husbId?:    string | null;
    wifeId?:    string | null;
    marrDate?:  string | null;
    marrPlace?: string | null;
    gedcomId?:  string | null;
  };

  // Validate that husbId and wifeId belong to the same tree when provided
  const personIdsToCheck = [body.husbId, body.wifeId].filter((v): v is string => !!v);

  if (personIdsToCheck.length > 0) {
    const foundPeople = await prisma.person.findMany({
      where:  { id: { in: personIdsToCheck }, treeId: tree.id },
      select: { id: true },
    });

    const foundIds = new Set(foundPeople.map((p) => p.id));
    const missing  = personIdsToCheck.filter((id) => !foundIds.has(id));

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Person(s) not found in this tree: ${missing.join(', ')}` },
        { status: 422 },
      );
    }
  }

  const family = await prisma.family.create({
    data: {
      id:        newCuid(),
      treeId:    tree.id,
      gedcomId:  body.gedcomId  ?? null,
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
      treeId:    tree.id,
      userId,
    },
  });

  return NextResponse.json(family, { status: 201 });
}
