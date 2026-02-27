import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NextResponse } from 'next/server';
import { requireTreeAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Props = { params: Promise<{ slug: string }> };

export default async function TreeAdminDashboard({ params }: Props) {
  const { slug } = await params;

  const access = await requireTreeAccess(slug, 'viewer');
  if (access instanceof NextResponse) redirect('/dashboard');

  const { tree } = access;
  const base = `/trees/${tree.slug}/admin`;

  const [peopleCount, familyCount, memberCount, recentLogs] = await Promise.all([
    prisma.person.count({ where: { treeId: tree.id } }),
    prisma.family.count({ where: { treeId: tree.id } }),
    prisma.treeMember.count({ where: { treeId: tree.id } }),
    prisma.auditLog.findMany({
      where: { treeId: tree.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    }),
  ]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <span
          style={{
            fontFamily: 'var(--font-sc)',
            fontSize: '0.8rem',
            color: 'var(--sepia)',
          }}
        >
          {tree.name}
        </span>
      </div>

      <div className="stat-grid">
        <Link href={`${base}/people`} className="stat-card">
          <div className="stat-card-value">{peopleCount.toLocaleString()}</div>
          <div className="stat-card-label">People</div>
        </Link>
        <Link href={`${base}/families`} className="stat-card">
          <div className="stat-card-value">{familyCount.toLocaleString()}</div>
          <div className="stat-card-label">Families</div>
        </Link>
        <Link href={`${base}/members`} className="stat-card">
          <div className="stat-card-value">{memberCount.toLocaleString()}</div>
          <div className="stat-card-label">Members</div>
        </Link>
      </div>

      {recentLogs.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              marginBottom: '0.75rem',
              color: 'var(--sepia)',
            }}
          >
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
                {recentLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <span
                        style={{
                          color:
                            log.action === 'delete'
                              ? 'var(--rust)'
                              : log.action === 'create'
                              ? 'var(--sepia)'
                              : 'var(--ink)',
                          fontFamily: 'var(--font-sc)',
                          fontSize: '0.78rem',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: 'var(--font-sc)',
                        fontSize: '0.78rem',
                        color: 'var(--sepia)',
                      }}
                    >
                      {log.tableName}
                    </td>
                    <td className="col-id">{log.recordId}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--sepia)' }}>
                      {log.user?.email ?? log.userId ?? '—'}
                    </td>
                    <td
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--sepia)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {recentLogs.length === 0 && (
        <p
          style={{
            marginTop: '2rem',
            color: 'var(--sepia)',
            fontStyle: 'italic',
            fontSize: '0.9rem',
          }}
        >
          No activity yet. Start by importing a GEDCOM file or adding people manually.
        </p>
      )}
    </div>
  );
}
