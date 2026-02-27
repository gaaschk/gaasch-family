'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { TreeMember, TreeInvite, TreeRole } from '@/types';

type MembersResponse = {
  members: (TreeMember & { user: { id: string; email: string; name: string | null; role: string } })[];
  invites: TreeInvite[];
};

const TREE_ROLES: TreeRole[] = ['viewer', 'editor', 'admin'];

export default function TreeMembersPage() {
  const params = useParams();
  const treeSlug = params.slug as string;

  const [data, setData] = useState<MembersResponse>({ members: [], invites: [] });
  const [loading, setLoading] = useState(true);

  // Invite form state
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState<TreeRole>('viewer');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [inviteError, setInviteError]   = useState('');
  const [inviteMsg, setInviteMsg]       = useState('');

  // Role change state
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [roleError, setRoleError]       = useState('');

  // Remove confirmation
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removing, setRemoving]               = useState(false);
  const [removeError, setRemoveError]         = useState('');

  // Revoke confirmation
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking]               = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/trees/${treeSlug}/members`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((res: MembersResponse) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [treeSlug]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteStatus('sending');
    setInviteError('');
    setInviteMsg('');

    try {
      const res = await fetch(`/api/trees/${treeSlug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const body = await res.json();
      if (!res.ok) {
        setInviteError(body.error ?? 'Failed to invite');
        setInviteStatus('error');
        return;
      }
      setInviteStatus('done');
      setInviteMsg(
        body.directlyAdded
          ? `${inviteEmail} has been added as a ${inviteRole}.`
          : `Invite sent to ${inviteEmail}.`,
      );
      setInviteEmail('');
      load();
    } catch {
      setInviteError('Network error — please try again');
      setInviteStatus('error');
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    setChangingRole(userId);
    setRoleError('');
    const res = await fetch(`/api/trees/${treeSlug}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    setChangingRole(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setRoleError(data.error ?? `Role change failed (${res.status})`);
      return;
    }
    load();
  }

  async function handleRemove(userId: string) {
    setRemoving(true);
    setRemoveError('');
    const res = await fetch(`/api/trees/${treeSlug}/members/${userId}`, { method: 'DELETE' });
    setConfirmRemoveId(null);
    setRemoving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setRemoveError(data.error ?? `Remove failed (${res.status})`);
      return;
    }
    load();
  }

  async function handleRevoke(inviteId: string) {
    setRevoking(true);
    await fetch(`/api/trees/${treeSlug}/invites/${inviteId}`, { method: 'DELETE' });
    setConfirmRevokeId(null);
    setRevoking(false);
    load();
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Members</h1>
      </div>

      {/* Invite form */}
      <section
        style={{
          marginBottom: '2.5rem',
          padding: '1.25rem',
          border: '1px solid var(--border-light)',
          borderRadius: 8,
          maxWidth: 520,
          background: '#fff',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            color: 'var(--ink)',
            marginBottom: '1rem',
          }}
        >
          Invite a member
        </h2>
        <form onSubmit={handleInvite}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label className="form-label" htmlFor="inv-email">
                Email address
              </label>
              <input
                id="inv-email"
                type="email"
                className="form-input"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="form-group" style={{ flex: '0 0 auto', marginBottom: 0 }}>
              <label className="form-label" htmlFor="inv-role">
                Role
              </label>
              <select
                id="inv-role"
                className="form-select"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as TreeRole)}
              >
                {TREE_ROLES.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={inviteStatus === 'sending'}
              style={{ flexShrink: 0 }}
            >
              {inviteStatus === 'sending' ? 'Sending\u2026' : 'Invite'}
            </button>
          </div>

          {inviteStatus === 'error' && (
            <p
              style={{
                color: 'var(--rust)',
                marginTop: '0.6rem',
                fontSize: '0.85rem',
              }}
            >
              {inviteError}
            </p>
          )}
          {inviteStatus === 'done' && inviteMsg && (
            <p
              style={{
                color: 'var(--ink)',
                marginTop: '0.6rem',
                fontSize: '0.85rem',
              }}
            >
              {inviteMsg}
            </p>
          )}
        </form>
      </section>

      {loading ? (
        <p style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>Loading…</p>
      ) : (
        <>
          {roleError && (
            <p style={{ color: 'var(--rust)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{roleError}</p>
          )}
          {removeError && (
            <p style={{ color: 'var(--rust)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{removeError}</p>
          )}

          {/* Members table */}
          <section style={{ marginBottom: '2rem' }}>
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
              Current members ({data.members.length})
            </h2>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontSize: '0.9rem' }}>{m.user.email}</td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--sepia)' }}>
                        {m.user.name ?? '—'}
                      </td>
                      <td>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.82rem', padding: '0.2rem 0.4rem' }}
                          value={m.role}
                          disabled={changingRole === m.userId}
                          onChange={e => handleRoleChange(m.userId, e.target.value)}
                        >
                          {TREE_ROLES.map(r => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--sepia)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>
                      <td>
                        {confirmRemoveId === m.userId ? (
                          <span className="inline-confirm">
                            Sure?{' '}
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemove(m.userId)}
                              disabled={removing}
                            >
                              Yes
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setConfirmRemoveId(null)}
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setConfirmRemoveId(m.userId)}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pending invites table */}
          {data.invites.length > 0 && (
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
                Pending invites ({data.invites.length})
              </h2>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Expires</th>
                      <th style={{ width: 120 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invites.map(inv => (
                      <tr key={inv.id}>
                        <td style={{ fontSize: '0.9rem' }}>{inv.email}</td>
                        <td>
                          <span className={`admin-role-badge ${inv.role}`}>
                            {inv.role}
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--sepia)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td>
                          {confirmRevokeId === inv.id ? (
                            <span className="inline-confirm">
                              Sure?{' '}
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRevoke(inv.id)}
                                disabled={revoking}
                              >
                                Yes
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setConfirmRevokeId(null)}
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setConfirmRevokeId(inv.id)}
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
