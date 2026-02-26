import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import FamilyForm from '@/components/FamilyForm';
import type { Family, Person } from '@/types';

type Props = { params: Promise<{ id: string }> };

export default async function EditFamilyPage({ params }: Props) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  const raw = await prisma.family.findUnique({
    where: { id: decodedId },
    include: {
      husband:  true,
      wife:     true,
      children: { include: { person: true } },
    },
  });

  if (!raw) notFound();

  function mapPerson(p: { id: string; name: string; sex: string | null; birthDate: string | null; birthPlace: string | null; deathDate: string | null; deathPlace: string | null; burialPlace: string | null; burialDate: string | null; occupation: string | null; notes: string | null; narrative: string | null; createdAt: Date; updatedAt: Date } | null): Person | null {
    if (!p) return null;
    return {
      id:          p.id,
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

  const family: Family & { husband: Person | null; wife: Person | null; children: { person: Person }[] } = {
    id:        raw.id,
    husbId:    raw.husbId,
    wifeId:    raw.wifeId,
    marrDate:  raw.marrDate,
    marrPlace: raw.marrPlace,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    husband:   mapPerson(raw.husband),
    wife:      mapPerson(raw.wife),
    children:  raw.children.map(c => ({
      familyId: c.familyId,
      personId: c.personId,
      person:   mapPerson(c.person)!,
    })),
  };

  const husbName = raw.husband?.name.replace(/\//g, '').trim() ?? null;
  const wifeName = raw.wife?.name.replace(/\//g, '').trim()   ?? null;
  const titleParts = [husbName, wifeName].filter(Boolean).join(' & ');

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          Edit: {titleParts || raw.id}
        </h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--sepia)' }}>
          {raw.id}
        </span>
      </div>
      <FamilyForm family={family} />
    </div>
  );
}
