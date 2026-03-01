import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ treeId: string; id: string; matchId: string }> };

// PATCH — accept (optionally updating person fields) or reject a match
export async function PATCH(req: NextRequest, { params }: Params) {
  const { treeId, id, matchId } = await params;

  const auth = await requireTreeAccess(treeId, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const match = await prisma.familySearchMatch.findFirst({
    where: { id: matchId, personId: id, treeId: tree.id },
  });
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  const body = await req.json() as {
    action: 'accept' | 'reject';
    fieldUpdates?: Record<string, string>; // explicit per-field values chosen by the editor
  };
  const { action, fieldUpdates = {} } = body;

  if (action === 'reject') {
    await prisma.familySearchMatch.update({
      where: { id: matchId },
      data:  { status: 'rejected' },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'accept') {
    // Only set fsPid for FamilySearch matches (it's a FS-specific identifier)
    const personUpdate: Record<string, string | null> = match.source === 'familysearch'
      ? { fsPid: match.fsPid }
      : {};

    // Apply exactly the fields the editor selected — overwrite regardless of current value
    const ALLOWED = new Set(['birthDate', 'birthPlace', 'deathDate', 'deathPlace', 'occupation']);
    for (const [k, v] of Object.entries(fieldUpdates)) {
      if (ALLOWED.has(k) && v) personUpdate[k] = v;
    }

    await prisma.$transaction([
      prisma.person.update({ where: { id }, data: personUpdate }),
      prisma.familySearchMatch.update({ where: { id: matchId }, data: { status: 'accepted' } }),
    ]);

    const updatedPerson = await prisma.person.findUnique({ where: { id } });
    return NextResponse.json({ ok: true, person: updatedPerson });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
