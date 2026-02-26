'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import type { UserProfile, UserRole } from '@/types';

const ALL_ROLES: UserRole[] = ['pending', 'viewer', 'editor', 'admin'];
const NEW_USER_ROLES: UserRole[] = ['viewer', 'editor', 'admin'];

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Add user form state
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('viewer');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Per-row state
  const [pendingRoles, setPendingRoles] = useState<Record<string, UserRole>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [forcingLogoutId, setForcingLogoutId] = useState<string | null>(null);
  const [forcedLogoutIds, setForcedLogoutIds] = useState<Set<string>>(new Set());
  const [confirmForceAll, setConfirmForceAll] = useState(false);
  const [forcingAll, setForcingAll] = useState(false);

  // Identify current user via /api/users/me
  useEffect(() => {
    fetch('/api/users/me')
      .then(r => r.ok ? r.json() : null)
      .then((data: { id: string } | null) => {
        if (data) setCurrentUserId(data.id);
      });
  }, []);

  function loadUsers() {
    setLoading(true);
    fetch('/api/users')
      .then(r => {
        if (r.status === 403 || r.status === 401) { setForbidden(true); return null; }
        return r.json();
      })
      .then((data: UserProfile[] | null) => {
        if (data) {
          setUsers(data);
          const initial: Record<string, UserRole> = {};
          data.forEach(u => { initial[u.id] = u.role; });
          setPendingRoles(initial);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail, role: addRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAddError(err.error ?? 'Failed to add user');
        return;
      }
      setAddEmail('');
      setAddRole('viewer');
      loadUsers();
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveRole(userId: string) {
    setSavingId(userId);
    try {
      await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: pendingRoles[userId] }),
      });
      loadUsers();
    } finally {
      setSavingId(null);
    }
  }

  async function handleForceLogout(userId: string) {
    setForcingLogoutId(userId);
    try {
      await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceLogout: true }),
      });
      setForcedLogoutIds(prev => new Set(prev).add(userId));
      setTimeout(() => setForcedLogoutIds(prev => {
        const next = new Set(prev); next.delete(userId); return next;
      }), 2000);
    } finally {
      setForcingLogoutId(null);
    }
  }

  async function handleForceLogoutAll() {
    setForcingAll(true);
    try {
      await fetch('/api/users/force-logout-all', { method: 'POST' });
      setConfirmForceAll(false);
      // Admin is now also logged out — sign out and redirect
      await signOut({ callbackUrl: '/login' });
    } finally {
      setForcingAll(false);
    }
  }

  async function handleDelete(userId: string) {
    setDeleting(true);
    try {
      await fetch(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      setConfirmDeleteId(null);
      loadUsers();
    } finally {
      setDeleting(false);
    }
  }

  if (forbidden) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Users</h1>
        </div>
        <p style={{ color: 'var(--rust)', fontStyle: 'italic' }}>
          Access denied — admin role required.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Users</h1>
      </div>

      {/* ── Add user form ── */}
      <section className="admin-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '1rem', color: 'var(--sepia)' }}>
          Add user
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--sepia)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
          Pre-register an account. The user signs in via magic link and their role is set here.
        </p>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 260px' }}>
            <label className="form-label" htmlFor="add-email">Email address</label>
            <input
              id="add-email"
              type="email"
              className="form-input"
              placeholder="user@example.com"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              required
            />
          </div>
          <div style={{ flex: '0 0 140px' }}>
            <label className="form-label" htmlFor="add-role">Role</label>
            <select
              id="add-role"
              className="form-input"
              value={addRole}
              onChange={e => setAddRole(e.target.value as UserRole)}
            >
              {NEW_USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={adding}
            style={{ flexShrink: 0 }}
          >
            {adding ? 'Adding…' : 'Add User'}
          </button>
        </form>
        {addError && (
          <p style={{ color: 'var(--rust)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            {addError}
          </p>
        )}
      </section>

      {/* ── Users table ── */}
      {!loading && users.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          {confirmForceAll ? (
            <span className="inline-confirm">
              Log out ALL users (including yourself)?{' '}
              <button
                className="btn btn-danger btn-sm"
                onClick={handleForceLogoutAll}
                disabled={forcingAll}
              >
                {forcingAll ? 'Working…' : 'Yes, log everyone out'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmForceAll(false)}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setConfirmForceAll(true)}
            >
              Force all to re-login
            </button>
          )}
        </div>
      )}
      {loading ? (
        <p style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>Loading…</p>
      ) : users.length === 0 ? (
        <p style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>No users found.</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Joined</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = u.id === currentUserId;
                const pendingRole = pendingRoles[u.id] ?? u.role;
                const roleChanged = pendingRole !== u.role;

                return (
                  <tr key={u.id}>
                    <td>
                      {u.email ?? '—'}
                      {isSelf && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--sepia)', fontStyle: 'italic' }}>
                          (you)
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--sepia)', fontSize: '0.85rem' }}>{u.name ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <select
                          className="form-input"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.82rem', width: 100 }}
                          value={pendingRole}
                          disabled={isSelf || savingId === u.id}
                          onChange={e => setPendingRoles(prev => ({
                            ...prev,
                            [u.id]: e.target.value as UserRole,
                          }))}
                        >
                          {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        {!isSelf && (
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={!roleChanged || savingId === u.id}
                            onClick={() => handleSaveRole(u.id)}
                          >
                            {savingId === u.id ? '…' : 'Save'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--sepia)', whiteSpace: 'nowrap' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {!isSelf && (
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={forcingLogoutId === u.id}
                            onClick={() => handleForceLogout(u.id)}
                            title="Invalidate this user's current session"
                          >
                            {forcedLogoutIds.has(u.id) ? 'Done!' : forcingLogoutId === u.id ? '…' : 'Re-login'}
                          </button>
                        )}
                        {!isSelf && (
                          confirmDeleteId === u.id ? (
                            <span className="inline-confirm">
                              Sure?{' '}
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(u.id)}
                                disabled={deleting}
                              >
                                Yes
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setConfirmDeleteId(u.id)}
                            >
                              Delete
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
