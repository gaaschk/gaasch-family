import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import EligibilityClient from './EligibilityClient';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EligibilityPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/trees/${slug}/eligibility`);
  }

  const userId = session.user.id;

  const tree = await prisma.tree.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { id: true, slug: true, name: true, ownerId: true },
  });

  if (!tree) redirect('/dashboard');

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

  const userName = session.user.name ?? session.user.email ?? '';
  const userInitials = userName
    .split(/[\s@]+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <>
      <nav className="heirloom-nav">
        <Link href="/home" className="heirloom-logo">
          heir<span className="heirloom-logo-accent">loom</span>
        </Link>
        <div className="heirloom-nav-links">
          <Link href={`/trees/${tree.slug}#explorer`} className="heirloom-nav-link">
            Explorer
          </Link>
          <Link href={`/trees/${tree.slug}#directory`} className="heirloom-nav-link">
            Directory
          </Link>
          <Link href={`/trees/${tree.slug}/eligibility`} className="heirloom-nav-link active">
            Eligibility
          </Link>
          {isAdmin && (
            <Link href={`/trees/${tree.slug}/admin`} className="heirloom-nav-link">
              Admin
            </Link>
          )}
        </div>
        <div className="heirloom-nav-right">
          <span style={{ fontSize: '12px', color: '#9a8a7a', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
            {tree.name}
          </span>
          <Link
            href="/home"
            className="heirloom-nav-avatar"
            title={userName}
          >
            {userInitials}
          </Link>
        </div>
      </nav>

      <EligibilityClient treeSlug={tree.slug} treeName={tree.name} />
    </>
  );
}
