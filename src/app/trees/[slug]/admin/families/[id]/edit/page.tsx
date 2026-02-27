import { notFound, redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { requireTreeAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import FamilyForm from '@/components/FamilyForm';
import type { Family, Person } from '@/types';

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function EditFamilyPage({ params }: Props) {
  const { slug, id } = await params;
  const decodedId = decodeURIComponent(id);

  const access = await requireTreeAccess(slug, 'editor');
  if (access instanceof NextResponse) redirect('/dashboard');

  const { tree } = access;

  const raw = await prisma.family.findFirst({
    where: { id: decodedId, treeId: tree.id },
    include: {
      husband: true,
      wife: true,
      children: { include: { person: true } },
    },
  });

  if (!raw) notFound();

  function toPerson(p: {
    id: string;
    treeId: string | null;
    gedcomId: string | null;
    name: string;
    sex: string | null;
    birthDate: string | null;
    birthPlace: string | null;
    deathDate: string | null;
    deathPlace: string | null;
    burialPlace: string | null;
    burialDate: string | null;
    occupation: string | null;
    notes: string | null;
    narrative: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null): Person | null {
    if (!p) return null;
    return {
      id:          p.id,
      treeId:      p.treeId,
      gedcomId:    p.gedcomId,
      name:        p.name,
      sex:         p.sex,
      birthDate:   p.birthDate,
      birthPlace:  p.birthPlace,
      deathDate:   p.deathDate,
      deathPlace:  p.deathPlace,
      burialPlace: p.burialPlace,
      burialDate:  p.burialDate,
      occupation:  p.occupation,
      notes:       p.notes,
      narrative:   p.narrative,
      createdAt:   p.createdAt.toISOString(),
      updatedAt:   p.updatedAt.toISOString(),
    };
  }

  const family: Family & {
    husband?: Person | null;
    wife?: Person | null;
    children?: { familyId: string; personId: string; person?: Person }[];
  } = {
    id:        raw.id,
    treeId:    raw.treeId,
    gedcomId:  raw.gedcomId,
    husbId:    raw.husbId,
    wifeId:    raw.wifeId,
    marrDate:  raw.marrDate,
    marrPlace: raw.marrPlace,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    husband:   toPerson(raw.husband),
    wife:      toPerson(raw.wife),
    children:  raw.children.map(c => ({
      familyId: c.familyId,
      personId: c.personId,
      person:   toPerson(c.person) ?? undefined,
    })),
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Edit Family</h1>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: 'var(--sepia)',
          }}
        >
          {raw.gedcomId ?? raw.id}
        </span>
      </div>
      <FamilyForm family={family} treeSlug={tree.slug} />
    </div>
  );
}
