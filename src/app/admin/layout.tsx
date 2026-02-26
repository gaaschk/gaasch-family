import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { UserRole } from '@/types';

async function SignOutButton() {
  return (
    <form action={async () => {
      'use server';
      await signOut({ redirectTo: '/login' });
    }}>
      <button type="submit" className="admin-signout-btn">
        Sign out
      </button>
    </form>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const role = (user?.role ?? 'viewer') as UserRole;

  return (
    <div className="admin-shell">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <p className="admin-sidebar-title">Gaasch Family</p>
          <p className="admin-sidebar-subtitle">Admin</p>
        </div>

        <nav className="admin-sidebar-nav">
          <span className="admin-nav-section">Navigation</span>
          <Link href="/admin" className="admin-nav-link">
            Dashboard
          </Link>
          <Link href="/admin/people" className="admin-nav-link">
            People
          </Link>
          <Link href="/admin/families" className="admin-nav-link">
            Families
          </Link>
          {role === 'admin' && (
            <Link href="/admin/users" className="admin-nav-link">
              Users
            </Link>
          )}
        </nav>

        <div className="admin-sidebar-footer">
          <p className="admin-user-email" title={session.user.email ?? ''}>
            {session.user.email}
          </p>
          <span className={`admin-role-badge ${role}`}>{role}</span>
          <SignOutButton />
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
