import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

async function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/login' });
      }}
    >
      <button type="submit" className="admin-signout-btn">
        Sign out
      </button>
    </form>
  );
}

export default async function TreeAdminLayout({ children, params }: Props) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user) redirect('/login');

  const userId = session.user.id;

  const tree = await prisma.tree.findFirst({
    where: { OR: [{ id: slug }, { slug }] },
  });

  if (!tree) redirect('/dashboard');

  // Determine access and role
  let treeRole: string | null = null;

  if (tree.ownerId === userId) {
    treeRole = 'admin';
  } else {
    const member = await prisma.treeMember.findUnique({
      where: { treeId_userId: { treeId: tree.id, userId } },
    });
    if (member) {
      treeRole = member.role;
    }
  }

  if (!treeRole) redirect('/dashboard');

  const isAdmin = treeRole === 'admin';
  const isPlatformAdmin = session.user.role === 'admin';
  const base = `/trees/${tree.slug}/admin`;

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <p className="admin-sidebar-title">{tree.name}</p>
          <p className="admin-sidebar-subtitle">Tree Admin</p>
        </div>

        <nav className="admin-sidebar-nav">
          <span className="admin-nav-section">Navigation</span>
          <Link href={base} className="admin-nav-link">
            Dashboard
          </Link>
          <Link href={`${base}/people`} className="admin-nav-link">
            People
          </Link>
          <Link href={`${base}/families`} className="admin-nav-link">
            Families
          </Link>

          {isAdmin && (
            <>
              <span className="admin-nav-section" style={{ marginTop: '0.75rem' }}>
                Admin
              </span>
              <Link href={`${base}/members`} className="admin-nav-link">
                Members
              </Link>
              <Link href={`${base}/import`} className="admin-nav-link">
                Import GEDCOM
              </Link>
              <Link href={`${base}/settings`} className="admin-nav-link">
                Settings
              </Link>
            </>
          )}

          <span className="admin-nav-section" style={{ marginTop: '0.75rem' }}>
            Integrations
          </span>
          <Link href={`${base}/familysearch`} className="admin-nav-link">
            FamilySearch
          </Link>

          <span className="admin-nav-section" style={{ marginTop: '0.75rem' }}>
            Tree
          </span>
          <Link href={`/trees/${tree.slug}/`} className="admin-nav-link">
            View Tree &rarr;
          </Link>
          <Link href="/dashboard" className="admin-nav-link">
            All Trees
          </Link>

          {isPlatformAdmin && (
            <>
              <span className="admin-nav-section" style={{ marginTop: '0.75rem' }}>
                Platform
              </span>
              <Link href="/admin" className="admin-nav-link">
                System Admin &rarr;
              </Link>
            </>
          )}
        </nav>

        <div className="admin-sidebar-footer">
          <p className="admin-user-email" title={session.user.email ?? ''}>
            {session.user.email}
          </p>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span className={`admin-role-badge ${treeRole}`}>
              tree: {treeRole}
            </span>
            {isPlatformAdmin && (
              <span className="admin-role-badge admin">platform admin</span>
            )}
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-content">{children}</main>
    </div>
  );
}
