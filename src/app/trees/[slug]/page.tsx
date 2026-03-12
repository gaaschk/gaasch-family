import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { TreePageComponents } from '@/components/public/ClientSections';

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

  const [defaultPersonSetting, fsToken] = await Promise.all([
    prisma.setting.findFirst({
      where: { treeId: tree.id, key: 'default_person_id' },
      select: { value: true },
    }),
    prisma.familySearchToken.findUnique({
      where:  { userId },
      select: { id: true },
    }),
  ]);
  const defaultPersonId  = defaultPersonSetting?.value ?? undefined;
  const hasFsConnection  = !!fsToken;

  return (
    <>
      <nav className="heirloom-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/home" className="heirloom-logo">
            heir<span className="heirloom-logo-accent">loom</span>
          </Link>
          <div className="heirloom-nav-links">
            <Link href={`/trees/${tree.slug}`} className="heirloom-nav-link active">
              Explorer
            </Link>
            <Link href={`/trees/${tree.slug}#directory`} className="heirloom-nav-link">
              Directory
            </Link>
            {isAdmin && (
              <Link href={`/trees/${tree.slug}/admin`} className="heirloom-nav-link">
                Admin
              </Link>
            )}
          </div>
        </div>
        <div className="heirloom-nav-right">
          <span style={{ fontSize: '12px', color: 'var(--heirloom-ink-muted)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
            {tree.name}
          </span>
          <Link href="/home" className="heirloom-nav-pill">
            Home
          </Link>
        </div>
      </nav>

      <TreePageComponents treeSlug={tree.slug} treeName={tree.name} role={treeRole} defaultPersonId={defaultPersonId} userId={userId} hasFsConnection={hasFsConnection} />
    </>
  );
}
