import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function SystemAdminDashboard() {
  const [totalUsers, pendingUsers, totalTrees] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'pending' } }),
    prisma.tree.count(),
  ]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">System Dashboard</h1>
      </div>

      <div className="stat-grid">
        <Link href="/admin/users" className="stat-card">
          <div className="stat-card-value">{totalUsers.toLocaleString()}</div>
          <div className="stat-card-label">Total Users</div>
        </Link>
        <Link href="/admin/users" className="stat-card" style={pendingUsers > 0 ? { borderColor: 'var(--rust)' } : {}}>
          <div className="stat-card-value" style={pendingUsers > 0 ? { color: 'var(--rust)' } : {}}>
            {pendingUsers.toLocaleString()}
          </div>
          <div className="stat-card-label">Pending Approval</div>
        </Link>
        <div className="stat-card">
          <div className="stat-card-value">{totalTrees.toLocaleString()}</div>
          <div className="stat-card-label">Trees</div>
        </div>
      </div>

      {pendingUsers > 0 && (
        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--rust)' }}>
          {pendingUsers} user{pendingUsers !== 1 ? 's' : ''} waiting for approval.{' '}
          <Link href="/admin/users" style={{ color: 'var(--rust)', textDecoration: 'underline' }}>
            Review now &rarr;
          </Link>
        </p>
      )}

      <section style={{ marginTop: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            marginBottom: '0.75rem',
            color: 'var(--sepia)',
          }}
        >
          Quick links
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li>
            <Link href="/admin/users" className="admin-nav-link" style={{ display: 'inline-block' }}>
              Manage Users
            </Link>
          </li>
          <li>
            <Link href="/admin/settings" className="admin-nav-link" style={{ display: 'inline-block' }}>
              FamilySearch Credentials
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
