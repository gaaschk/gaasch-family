import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/auth';

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

export default async function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/dashboard');

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <p className="admin-sidebar-title">System Admin</p>
          <p className="admin-sidebar-subtitle">Platform Management</p>
        </div>

        <nav className="admin-sidebar-nav">
          <span className="admin-nav-section">Overview</span>
          <Link href="/admin" className="admin-nav-link">
            Dashboard
          </Link>

          <span className="admin-nav-section" style={{ marginTop: '0.75rem' }}>
            Management
          </span>
          <Link href="/admin/users" className="admin-nav-link">
            Users
          </Link>

          <span className="admin-nav-section" style={{ marginTop: '0.75rem' }}>
            Integrations
          </span>
          <Link href="/admin/settings" className="admin-nav-link">
            FamilySearch
          </Link>

          <span className="admin-nav-section" style={{ marginTop: '0.75rem' }}>
            Navigation
          </span>
          <Link href="/home" className="admin-nav-link">
            Home &rarr;
          </Link>
          <Link href="/dashboard" className="admin-nav-link">
            All Trees
          </Link>
        </nav>

        <div className="admin-sidebar-footer">
          <p className="admin-user-email" title={session.user.email ?? ''}>
            {session.user.email}
          </p>
          <span className="admin-role-badge admin">admin</span>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-content">{children}</main>
    </div>
  );
}
