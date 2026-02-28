import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { requireTreeAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import FamilyForm from '@/components/FamilyForm';
import type { Person } from '@/types';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ husbId?: string; wifeId?: string; childId?: string }>;
};

function serializePerson(p: {
  id: string; treeId: string; gedcomId: string | null; name: string; sex: string | null;
  birthDate: string | null; birthPlace: string | null; deathDate: string | null;
  deathPlace: string | null; burialDate: string | null; burialPlace: string | null;
  occupation: string | null; notes: string | null; narrative: string | null;
  createdAt: Date; updatedAt: Date;
} | null): Person | null {
  if (!p) return null;
  return { ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
}

export default async function NewFamilyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { husbId, wifeId, childId } = await searchParams;

  const access = await requireTreeAccess(slug, 'editor');
  if (access instanceof NextResponse) redirect('/dashboard');

  const { tree } = access;

  const personSelect = {
    id: true, treeId: true, gedcomId: true, name: true, sex: true,
    birthDate: true, birthPlace: true, deathDate: true, deathPlace: true,
    burialDate: true, burialPlace: true, occupation: true, notes: true,
    narrative: true, createdAt: true, updatedAt: true,
  } as const;

  const [rawHusb, rawWife, rawChild] = await Promise.all([
    husbId  ? prisma.person.findFirst({ where: { id: husbId,  treeId: tree.id }, select: personSelect }) : null,
    wifeId  ? prisma.person.findFirst({ where: { id: wifeId,  treeId: tree.id }, select: personSelect }) : null,
    childId ? prisma.person.findFirst({ where: { id: childId, treeId: tree.id }, select: personSelect }) : null,
  ]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">New Family</h1>
      </div>
      <FamilyForm
        treeSlug={tree.slug}
        initialHusband={serializePerson(rawHusb)}
        initialWife={serializePerson(rawWife)}
        initialChild={serializePerson(rawChild)}
      />
    </div>
  );
}
