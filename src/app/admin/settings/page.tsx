'use client';

import { useState, useEffect } from 'react';

type SystemSetting = { key: string; value: string };

export default function SystemSettingsPage() {
  const [clientId, setClientId]       = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret]   = useState(false);
  const [status, setStatus]           = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg]       = useState('');
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then((rows: SystemSetting[]) => {
        const byKey = Object.fromEntries(rows.map(r => [r.key, r.value]));
        setClientId(byKey['fs_client_id'] ?? '');
        setClientSecret(byKey['fs_client_secret'] ?? '');
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setErrorMsg('');

    try {
      const saves = [
        { key: 'fs_client_id',     value: clientId.trim() },
        { key: 'fs_client_secret', value: clientSecret.trim() },
      ];

      for (const payload of saves) {
        const res = await fetch('/api/admin/settings', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json() as { error?: string };
          throw new Error(body.error ?? 'Save failed');
        }
      }

      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed');
      setStatus('error');
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">System Settings</h1>
      </div>

      {loading ? (
        <p style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>Loading…</p>
      ) : (
        <form onSubmit={save} style={{ maxWidth: 520 }}>
          <section
            style={{
              padding: '1.25rem',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              background: '#fff',
              marginBottom: '1.5rem',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                color: 'var(--ink)',
                marginBottom: '0.25rem',
              }}
            >
              FamilySearch OAuth Credentials
            </h2>
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--sepia)',
                marginBottom: '1.25rem',
              }}
            >
              Values set here override the{' '}
              <code style={{ fontSize: '0.8rem' }}>FAMILYSEARCH_CLIENT_ID</code> /{' '}
              <code style={{ fontSize: '0.8rem' }}>FAMILYSEARCH_CLIENT_SECRET</code> environment variables.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="fs-client-id">
                Client ID
              </label>
              <input
                id="fs-client-id"
                type="text"
                className="form-input"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="e.g. ABCD-1234-EFGH-5678"
                autoComplete="off"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="fs-client-secret">
                Client Secret
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  id="fs-client-secret"
                  type={showSecret ? 'text' : 'password'}
                  className="form-input"
                  value={clientSecret}
                  onChange={e => setClientSecret(e.target.value)}
                  placeholder="Client secret"
                  autoComplete="new-password"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowSecret(s => !s)}
                  style={{ flexShrink: 0 }}
                >
                  {showSecret ? 'Hide' : 'Reveal'}
                </button>
              </div>
            </div>
          </section>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === 'saving'}
            >
              {status === 'saving' ? 'Saving…' : 'Save'}
            </button>

            {status === 'saved' && (
              <span style={{ color: 'var(--ink)', fontSize: '0.875rem' }}>
                Saved.
              </span>
            )}
            {status === 'error' && (
              <span style={{ color: 'var(--rust)', fontSize: '0.875rem' }}>
                {errorMsg}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
