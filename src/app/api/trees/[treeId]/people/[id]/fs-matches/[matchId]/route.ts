import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';
import type { FsPersonSummary } from '@/lib/familysearch';

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

  const body = await req.json() as { action: 'accept' | 'reject'; updateFields?: boolean };
  const { action, updateFields = false } = body;

  if (action === 'reject') {
    await prisma.familySearchMatch.update({
      where: { id: matchId },
      data:  { status: 'rejected' },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'accept') {
    const fsData = JSON.parse(match.fsData) as FsPersonSummary;

    // Build person update data
    const personUpdate: Record<string, string | null> = { fsPid: match.fsPid };

    if (updateFields) {
      // Fetch current person to only fill empty fields
      const person = await prisma.person.findUnique({ where: { id } });
      if (person) {
        if (!person.birthDate  && fsData.birthDate)  personUpdate.birthDate  = fsData.birthDate;
        if (!person.birthPlace && fsData.birthPlace) personUpdate.birthPlace = fsData.birthPlace;
        if (!person.deathDate  && fsData.deathDate)  personUpdate.deathDate  = fsData.deathDate;
        if (!person.deathPlace && fsData.deathPlace) personUpdate.deathPlace = fsData.deathPlace;
        if (!person.occupation && fsData.occupation) personUpdate.occupation = fsData.occupation;
      }
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
