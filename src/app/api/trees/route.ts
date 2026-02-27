import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(_req: NextRequest) {
  const auth = await requireRole('viewer');
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;

  // Fetch trees owned by user + trees where user is a member
  const [ownedRaw, memberRows] = await Promise.all([
    prisma.tree.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.treeMember.findMany({
      where: { userId },
      include: {
        tree: {
          include: { _count: { select: { members: true } } },
        },
      },
      orderBy: { joinedAt: 'asc' },
    }),
  ]);

  const owned = ownedRaw.map(({ _count, ...tree }) => ({
    ...tree,
    memberCount: _count.members,
  }));

  const member = memberRows.map(({ tree: { _count, ...tree } }) => ({
    ...tree,
    memberCount: _count.members,
  }));

  return NextResponse.json({ owned, member });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('viewer');
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;

  const body = (await req.json()) as { name?: string; slug?: string; description?: string };

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (!body.slug || typeof body.slug !== 'string') {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const slug = body.slug.trim().toLowerCase();

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: 'slug must be lowercase alphanumeric with hyphens only (e.g. my-family-tree)' },
      { status: 400 },
    );
  }

  const existing = await prisma.tree.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: 'A tree with that slug already exists' }, { status: 409 });
  }

  const tree = await prisma.$transaction(async (tx) => {
    const created = await tx.tree.create({
      data: {
        slug,
        name:        body.name!.trim(),
        description: body.description?.trim() ?? null,
        ownerId:     userId,
      },
    });

    await tx.treeMember.create({
      data: {
        treeId: created.id,
        userId,
        role:   'admin',
      },
    });

    return created;
  });

  return NextResponse.json(tree, { status: 201 });
}
