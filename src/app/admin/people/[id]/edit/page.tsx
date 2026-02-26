import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PersonForm from '@/components/PersonForm';
import type { Person } from '@/types';

type Props = { params: Promise<{ id: string }> };

export default async function EditPersonPage({ params }: Props) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  const raw = await prisma.person.findUnique({ where: { id: decodedId } });
  if (!raw) notFound();

  const person: Person = {
    id:          raw.id,
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

  // Fetch family memberships for display
  const childIn = await prisma.familyChild.findMany({
    where: { personId: decodedId },
    include: { family: { include: { husband: true, wife: true } } },
  });

  const spouseIn = await prisma.family.findMany({
    where: { OR: [{ husbId: decodedId }, { wifeId: decodedId }] },
    include: { husband: true, wife: true },
  });

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          Edit: {raw.name.replace(/\//g, '').trim()}
        </h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--sepia)' }}>
          {raw.id}
        </span>
      </div>

      <PersonForm person={person} />

      {/* Read-only family memberships */}
      {(childIn.length > 0 || spouseIn.length > 0) && (
        <section style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--sepia)' }}>
            Family Memberships
          </h2>

          {childIn.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontFamily: 'var(--font-sc)', fontSize: '0.78rem', color: 'var(--sepia)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                Child in
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
                {childIn.map(fc => (
                  <li key={fc.familyId}>
                    <a href={`/admin/families/${encodeURIComponent(fc.familyId)}/edit`}>
                      {fc.familyId}
                    </a>
                    {' — '}
                    {[fc.family.husband?.name, fc.family.wife?.name].filter(Boolean).join(' & ').replace(/\//g, '') || '(unnamed)'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {spouseIn.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-sc)', fontSize: '0.78rem', color: 'var(--sepia)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                Spouse in
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
                {spouseIn.map(f => (
                  <li key={f.id}>
                    <a href={`/admin/families/${encodeURIComponent(f.id)}/edit`}>
                      {f.id}
                    </a>
                    {f.marrDate && ` — m. ${f.marrDate}`}
                    {f.marrPlace && ` · ${f.marrPlace}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
