import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import StoryReader from './StoryReader';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string; personId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug, personId } = await params;

  const tree = await prisma.tree.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { id: true, name: true },
  });
  if (!tree) return {};

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId: tree.id },
    select: { name: true },
  });
  if (!person) return {};

  const personName = person.name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
  return { title: `${personName} — ${tree.name}` };
}

export default async function StoryPage({ params }: Props) {
  const { slug, personId } = await params;

  // Session is optional — story pages are public
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const tree = await prisma.tree.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { id: true, slug: true, name: true, ownerId: true },
  });
  if (!tree) notFound();

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId: tree.id },
    select: { id: true, name: true, birthDate: true, deathDate: true },
  });
  if (!person) notFound();

  // Determine tree role from session
  let treeRole: string | null = null;
  if (userId) {
    if (tree.ownerId === userId) {
      treeRole = 'admin';
    } else {
      const member = await prisma.treeMember.findUnique({
        where: { treeId_userId: { treeId: tree.id, userId } },
        select: { role: true },
      });
      if (member) treeRole = member.role;
    }
  }

  const canEdit = treeRole === 'editor' || treeRole === 'admin';

  // Load stored story — match either exact key or key ending with this personId
  const story = await prisma.lineageStory.findFirst({
    where: {
      treeId: tree.id,
      OR: [
        { personIdsKey: personId },
        { personIdsKey: { endsWith: `,${personId}` } },
      ],
    },
    select: { html: true, personIdsKey: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  // If story exists, bulk-load the lineage people in order
  let lineage: { id: string; name: string; birthDate: string | null; deathDate: string | null }[] = [];
  if (story) {
    const ids = story.personIdsKey.split(',');
    const people = await prisma.person.findMany({
      where: { id: { in: ids }, treeId: tree.id },
      select: { id: true, name: true, birthDate: true, deathDate: true },
    });
    // Restore original order
    const byId = new Map(people.map(p => [p.id, p]));
    lineage = ids.map(id => byId.get(id)).filter(Boolean) as typeof lineage;
  }

  return (
    <StoryReader
      treeSlug={tree.slug}
      treeName={tree.name}
      person={person}
      story={story ? { html: story.html, updatedAt: story.updatedAt.toISOString() } : null}
      lineage={lineage}
      canEdit={canEdit}
      personId={personId}
    />
  );
}
