'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import PersonSearch from '@/components/PersonSearch';
import type { Person } from '@/types';

type Member = {
  id: string;
  userId: string;
  role: string;
  user: { id: string; email: string; name: string | null };
};

type Setting = { key: string; value: string };

export default function TreeSettingsPage() {
  const params = useParams();
  const treeSlug = params.slug as string;

  const [hasToken, setHasToken]       = useState(false);
  const [newToken, setNewToken]       = useState('');
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'generating' | 'copied'>('idle');

  const [defaultPerson, setDefaultPerson] = useState<Person | null>(null);
  const [defaultPersonStatus, setDefaultPersonStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [members, setMembers]               = useState<Member[]>([]);
  const [isOwner, setIsOwner]               = useState(false);
  const [newOwnerId, setNewOwnerId]         = useState('');
  const [transferStatus, setTransferStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [transferError, setTransferError]   = useState('');

  useEffect(() => {
    fetch(`/api/trees/${treeSlug}/members`)
      .then(r => r.json())
      .then((data: { members: Member[]; isOwner?: boolean }) => {
        setMembers(data.members ?? []);
        setIsOwner(data.isOwner ?? false);
      })
      .catch(() => {});
  }, [treeSlug]);

  useEffect(() => {
    fetch(`/api/trees/${treeSlug}/settings`)
      .then(r => r.json())
      .then((data: Setting[]) => {
        const t = data.find(s => s.key === 'api_token');
        const d = data.find(s => s.key === 'default_person_id');
        if (t) setHasToken(true);
        if (d?.value) {
          fetch(`/api/trees/${treeSlug}/people/${encodeURIComponent(d.value)}`)
            .then(r => r.ok ? r.json() : null)
            .then(p => { if (p) setDefaultPerson(p as Person); })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [treeSlug]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Settings</h1>
      </div>

      {/* Default Starting Person */}
      <section
        style={{
          marginTop: '2.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-light)',
          maxWidth: 520,
        }}
      >
        <p className="section-title" style={{ marginBottom: '0.5rem' }}>
          Starting Person
        </p>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--sepia)',
            marginBottom: '1.25rem',
            lineHeight: 1.6,
          }}
        >
          This person opens by default when someone visits the tree. They also
          serve as the root for the lineage trail shown when navigating to other
          people.
        </p>

        <PersonSearch
          treeSlug={treeSlug}
          value={defaultPerson}
          onChange={setDefaultPerson}
          placeholder="Search for a person…"
          label="Default person"
        />

        {defaultPersonStatus === 'saved' && (
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--ink)',
              marginTop: '0.5rem',
            }}
          >
            Saved
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          disabled={defaultPersonStatus === 'saving' || !defaultPerson}
          onClick={async () => {
            if (!defaultPerson) return;
            setDefaultPersonStatus('saving');
            await fetch(`/api/trees/${treeSlug}/settings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'default_person_id', value: defaultPerson.id }),
            });
            setDefaultPersonStatus('saved');
            setTimeout(() => setDefaultPersonStatus('idle'), 2500);
          }}
        >
          {defaultPersonStatus === 'saving' ? 'Saving…' : 'Save starting person'}
        </button>
      </section>

      {/* Transfer Ownership */}
      {isOwner && members.length > 1 && (
        <section
          style={{
            marginTop: '2.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-light)',
            maxWidth: 520,
          }}
        >
          <p className="section-title" style={{ marginBottom: '0.5rem', color: 'var(--rust)' }}>
            Transfer Ownership
          </p>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--sepia)',
              marginBottom: '1.25rem',
              lineHeight: 1.6,
            }}
          >
            Assign ownership to another tree member. You will remain an admin
            member of the tree after the transfer.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="new-owner">
              New owner
            </label>
            <select
              id="new-owner"
              className="form-select"
              value={newOwnerId}
              onChange={e => setNewOwnerId(e.target.value)}
            >
              <option value="">— select a member —</option>
              {members.map(m => (
                <option key={m.userId} value={m.userId}>
                  {m.user.email}{m.user.name ? ` (${m.user.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {transferStatus === 'error' && (
            <p style={{ color: 'var(--rust)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              {transferError}
            </p>
          )}
          {transferStatus === 'done' && (
            <p style={{ color: 'var(--ink)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Ownership transferred.
            </p>
          )}

          <button
            type="button"
            className="btn btn-danger"
            disabled={!newOwnerId || transferStatus === 'saving'}
            onClick={async () => {
              if (!newOwnerId) return;
              setTransferStatus('saving');
              setTransferError('');
              try {
                const res = await fetch(`/api/trees/${treeSlug}`, {
                  method:  'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body:    JSON.stringify({ newOwnerId }),
                });
                if (!res.ok) {
                  const body = await res.json() as { error?: string };
                  throw new Error(body.error ?? 'Transfer failed');
                }
                setTransferStatus('done');
                setIsOwner(false);
              } catch (err) {
                setTransferError(err instanceof Error ? err.message : 'Transfer failed');
                setTransferStatus('error');
              }
            }}
          >
            {transferStatus === 'saving' ? 'Transferring…' : 'Transfer ownership'}
          </button>
        </section>
      )}

      {/* API Access Token */}
      <section
        style={{
          marginTop: '2.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-light)',
          maxWidth: 520,
        }}
      >
        <p className="section-title" style={{ marginBottom: '0.5rem' }}>
          API Access Token
        </p>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--sepia)',
            marginBottom: '1.25rem',
            lineHeight: 1.6,
          }}
        >
          Use this token to call tree API endpoints from scripts or external
          tools without a browser session. Pass it as{' '}
          <code
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85em',
              background: 'rgba(0,0,0,0.05)',
              padding: '0 0.25em',
              borderRadius: 3,
            }}
          >
            Authorization: Bearer &lt;token&gt;
          </code>
          .
        </p>

        {newToken ? (
          <div style={{ marginBottom: '1rem' }}>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--rust)',
                marginBottom: '0.4rem',
              }}
            >
              Copy your token now — it will be masked after you leave this page.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                readOnly
                value={newToken}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.6rem',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  background: 'var(--parchment)',
                  color: 'var(--ink)',
                }}
              />
              <button
                className="btn btn-primary"
                style={{ whiteSpace: 'nowrap' }}
                onClick={() => {
                  navigator.clipboard.writeText(newToken);
                  setTokenStatus('copied');
                  setTimeout(() => setTokenStatus('idle'), 2000);
                }}
              >
                {tokenStatus === 'copied' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          hasToken && (
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--sepia)',
                marginBottom: '1rem',
              }}
            >
              A token is currently set.
            </p>
          )
        )}

        <button
          className="btn btn-primary"
          disabled={tokenStatus === 'generating'}
          onClick={async () => {
            setTokenStatus('generating');
            const token = crypto.randomUUID();
            await fetch(`/api/trees/${treeSlug}/settings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'api_token', value: token }),
            });
            setNewToken(token);
            setHasToken(true);
            setTokenStatus('idle');
          }}
        >
          {tokenStatus === 'generating'
            ? 'Generating\u2026'
            : hasToken
            ? 'Regenerate token'
            : 'Generate token'}
        </button>
      </section>
    </div>
  );
}
