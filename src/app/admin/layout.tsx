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
    <>
      <input type="checkbox" id="admin-nav-toggle" className="admin-nav-toggle" />

      <div className="admin-shell">
        <label htmlFor="admin-nav-toggle" className="admin-mobile-backdrop" aria-hidden="true" />

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
            Configuration
          </span>
          <Link href="/admin/settings" className="admin-nav-link">
            AI &amp; Integrations
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
      <main className="admin-content">
        <div className="admin-mobile-header">
          <label htmlFor="admin-nav-toggle" className="admin-hamburger" aria-label="Open navigation">
            <span />
            <span />
            <span />
          </label>
          <span className="admin-mobile-title">System Admin</span>
        </div>
        {children}
      </main>
    </div>
    </>
  );
}
