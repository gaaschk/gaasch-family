import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';
import { searchAndStoreMatches } from '@/lib/familysearch';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string; id: string }> };

// GET — list pending matches for a person
export async function GET(_req: NextRequest, { params }: Params) {
  const { treeId, id } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const matches = await prisma.familySearchMatch.findMany({
    where:   { personId: id, treeId: tree.id, status: 'pending' },
    orderBy: { score: 'desc' },
  });

  return NextResponse.json({ matches });
}

// POST — (re)trigger a FamilySearch search for this person
export async function POST(_req: NextRequest, { params }: Params) {
  const { treeId, id } = await params;

  const auth = await requireTreeAccess(treeId, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { tree, userId } = auth;

  // Verify person belongs to this tree
  const person = await prisma.person.findFirst({
    where: { id, treeId: tree.id },
  });
  if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });

  // Run search (awaited here since this is a user-triggered action)
  await searchAndStoreMatches(id, tree.id, userId);

  const matches = await prisma.familySearchMatch.findMany({
    where:   { personId: id, treeId: tree.id, status: 'pending' },
    orderBy: { score: 'desc' },
  });

  return NextResponse.json({ matches });
}
