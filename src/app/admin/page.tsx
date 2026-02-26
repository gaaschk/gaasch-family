import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const [peopleCount, familyCount, recentEdits] = await Promise.all([
    prisma.person.count(),
    prisma.family.count(),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    }),
  ]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
      </div>

      <div className="stat-grid">
        <Link href="/admin/people" className="stat-card">
          <div className="stat-card-value">{peopleCount.toLocaleString()}</div>
          <div className="stat-card-label">People</div>
        </Link>
        <Link href="/admin/families" className="stat-card">
          <div className="stat-card-value">{familyCount.toLocaleString()}</div>
          <div className="stat-card-label">Families</div>
        </Link>
        <div className="stat-card">
          <div className="stat-card-value">{recentEdits.length}</div>
          <div className="stat-card-label">Recent edits</div>
        </div>
      </div>

      {recentEdits.length > 0 && (
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--sepia)' }}>
            Recent activity
          </h2>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Table</th>
                  <th>Record</th>
                  <th>By</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recentEdits.map(log => (
                  <tr key={log.id}>
                    <td>
                      <span style={{
                        color: log.action === 'delete' ? 'var(--rust)'
                          : log.action === 'create' ? 'var(--sepia)'
                          : 'var(--ink)',
                        fontFamily: 'var(--font-sc)',
                        fontSize: '0.78rem',
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-sc)', fontSize: '0.78rem', color: 'var(--sepia)' }}>
                      {log.tableName}
                    </td>
                    <td className="col-id">{log.recordId}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--sepia)' }}>
                      {log.user?.email ?? log.userId ?? '—'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--sepia)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
