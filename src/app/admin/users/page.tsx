'use client';

import { useState, useEffect, useCallback } from 'react';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

const PLATFORM_ROLES = ['pending', 'viewer', 'editor', 'admin'] as const;

export default function SystemUsersPage() {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/users')
      .then(r => r.json())
      .then((data: User[]) => setUsers(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRoleChange(userId: string, role: string) {
    setChangingRole(userId);
    await fetch(`/api/users/${userId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ role }),
    });
    setChangingRole(null);
    load();
  }

  const pending = users.filter(u => u.role === 'pending');
  const others  = users.filter(u => u.role !== 'pending');

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Users</h1>
        <span style={{ fontSize: '0.85rem', color: 'var(--sepia)' }}>
          {users.length} total
          {pending.length > 0 && (
            <span style={{ color: 'var(--rust)', marginLeft: '0.5rem' }}>
              · {pending.length} pending
            </span>
          )}
        </span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>Loading…</p>
      ) : (
        <>
          {/* Pending approval */}
          {pending.length > 0 && (
            <section style={{ marginBottom: '2.5rem' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-sc)',
                  fontSize: '0.8rem',
                  letterSpacing: '0.08em',
                  color: 'var(--rust)',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}
              >
                Pending approval ({pending.length})
              </h2>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Joined</th>
                      <th style={{ width: 180 }}>Approve as</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontSize: '0.9rem' }}>{u.email}</td>
                        <td style={{ fontSize: '0.9rem', color: 'var(--sepia)' }}>{u.name ?? '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--sepia)', whiteSpace: 'nowrap' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={changingRole === u.id}
                              onClick={() => handleRoleChange(u.id, 'viewer')}
                            >
                              Approve
                            </button>
                            <select
                              className="form-select"
                              style={{ fontSize: '0.82rem', padding: '0.2rem 0.4rem' }}
                              defaultValue="viewer"
                              disabled={changingRole === u.id}
                              onChange={e => handleRoleChange(u.id, e.target.value)}
                            >
                              {PLATFORM_ROLES.filter(r => r !== 'pending').map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* All other users */}
          <section>
            <h2
              style={{
                fontFamily: 'var(--font-sc)',
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                color: 'var(--sepia)',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
              }}
            >
              Active users ({others.length})
            </h2>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {others.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontSize: '0.9rem' }}>{u.email}</td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--sepia)' }}>{u.name ?? '—'}</td>
                      <td>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.82rem', padding: '0.2rem 0.4rem' }}
                          value={u.role}
                          disabled={changingRole === u.id}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                        >
                          {PLATFORM_ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--sepia)', whiteSpace: 'nowrap' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
