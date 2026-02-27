import { notFound, redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { requireTreeAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PersonForm from '@/components/PersonForm';
import type { Person } from '@/types';

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function EditPersonPage({ params }: Props) {
  const { slug, id } = await params;
  const decodedId = decodeURIComponent(id);

  const access = await requireTreeAccess(slug, 'editor');
  if (access instanceof NextResponse) redirect('/dashboard');

  const { tree } = access;

  const raw = await prisma.person.findFirst({
    where: { id: decodedId, treeId: tree.id },
  });

  if (!raw) notFound();

  const person: Person = {
    id:          raw.id,
    treeId:      raw.treeId,
    gedcomId:    raw.gedcomId,
    name:        raw.name,
    sex:         raw.sex,
    birthDate:   raw.birthDate,
    birthPlace:  raw.birthPlace,
    deathDate:   raw.deathDate,
    deathPlace:  raw.deathPlace,
    burialPlace: raw.burialPlace,
    burialDate:  raw.burialDate,
    occupation:  raw.occupation,
    notes:       raw.notes,
    narrative:   raw.narrative,
    createdAt:   raw.createdAt.toISOString(),
    updatedAt:   raw.updatedAt.toISOString(),
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          Edit: {raw.name.replace(/\//g, '').trim()}
        </h1>
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
      <PersonForm person={person} treeSlug={tree.slug} />
    </div>
  );
}
