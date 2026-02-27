import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  PublicTreeExplorer,
  PublicDirectorySection,
} from '@/components/public/ClientSections';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function TreePage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/trees/${slug}`);
  }

  const userId = session.user.id;

  // Resolve tree by slug or id
  const tree = await prisma.tree.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { id: true, slug: true, name: true, ownerId: true },
  });

  if (!tree) redirect('/dashboard');

  // Determine membership
  let treeRole: string | null = null;

  if (tree.ownerId === userId) {
    treeRole = 'admin';
  } else {
    const member = await prisma.treeMember.findUnique({
      where: { treeId_userId: { treeId: tree.id, userId } },
    });
    if (member) treeRole = member.role;
  }

  if (!treeRole) redirect('/dashboard');

  const isAdmin = treeRole === 'admin';

  const defaultPersonSetting = await prisma.setting.findFirst({
    where: { treeId: tree.id, key: 'default_person_id' },
    select: { value: true },
  });
  const defaultPersonId = defaultPersonSetting?.value ?? undefined;

  return (
    <>
      <nav className="pub-nav">
        <Link href={`/trees/${tree.slug}`} className="pub-nav-title">
          {tree.name}
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isAdmin && (
            <Link href={`/trees/${tree.slug}/admin`} className="pub-nav-admin">
              Admin
            </Link>
          )}
          <Link href="/home" className="pub-nav-admin">
            Home
          </Link>
        </div>
      </nav>

      <div className="pub-page">
        <PublicTreeExplorer treeSlug={tree.slug} treeName={tree.name} role={treeRole} defaultPersonId={defaultPersonId} userId={userId} />

        <PublicDirectorySection treeSlug={tree.slug} />

        <footer className="pub-footer">
          <span className="pub-footer-ornament">✦ ✦ ✦</span>
          {tree.name} — Family History
        </footer>
      </div>
    </>
  );
}
