'use client';

import { useState, useEffect } from 'react';

type SystemSetting = { key: string; value: string };

const MODELS = [
  { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6 (recommended)' },
  { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6 (highest quality)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest / cheapest)' },
];

export default function SystemSettingsPage() {
  const [clientId, setClientId]         = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret]     = useState(false);
  const [fsStatus, setFsStatus]         = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [fsError, setFsError]           = useState('');

  const [apiKey, setApiKey]             = useState('');
  const [maskedKey, setMaskedKey]       = useState('');
  const [showApiKey, setShowApiKey]     = useState(false);
  const [model, setModel]               = useState('claude-sonnet-4-6');
  const [aiStatus, setAiStatus]         = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [aiError, setAiError]           = useState('');

  const [emailServer, setEmailServer]   = useState('');
  const [maskedServer, setMaskedServer] = useState('');
  const [showServer, setShowServer]     = useState(false);
  const [emailFrom, setEmailFrom]       = useState('');
  const [emailBcc, setEmailBcc]         = useState('');
  const [emailStatus, setEmailStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [emailError, setEmailError]     = useState('');

  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then((rows: SystemSetting[]) => {
        const byKey = Object.fromEntries(rows.map(r => [r.key, r.value]));
        setClientId(byKey['fs_client_id'] ?? '');
        setClientSecret(byKey['fs_client_secret'] ?? '');
        if (byKey['anthropic_api_key']) setMaskedKey('(saved)');
        if (byKey['anthropic_model'])   setModel(byKey['anthropic_model']);
        if (byKey['email_server'])      setMaskedServer('(saved)');
        if (byKey['email_from'])        setEmailFrom(byKey['email_from']);
        if (byKey['email_bcc'])         setEmailBcc(byKey['email_bcc']);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus('saving');
    setEmailError('');
    try {
      // Save from + bcc addresses always
      await fetch('/api/admin/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key: 'email_from', value: emailFrom.trim() }),
      });
      await fetch('/api/admin/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key: 'email_bcc', value: emailBcc.trim() }),
      });
      // Save server only if the user typed something new
      if (emailServer.trim()) {
        const res = await fetch('/api/admin/settings', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ key: 'email_server', value: emailServer.trim() }),
        });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Save failed');
        setEmailServer('');
        setMaskedServer('(saved)');
      }
      setEmailStatus('saved');
      setTimeout(() => setEmailStatus('idle'), 3000);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Save failed');
      setEmailStatus('error');
    }
  }

  async function saveFamilySearch(e: React.FormEvent) {
    e.preventDefault();
    setFsStatus('saving');
    setFsError('');
    try {
      for (const payload of [
        { key: 'fs_client_id',     value: clientId.trim() },
        { key: 'fs_client_secret', value: clientSecret.trim() },
      ]) {
        const res = await fetch('/api/admin/settings', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Save failed');
      }
      setFsStatus('saved');
      setTimeout(() => setFsStatus('idle'), 3000);
    } catch (err) {
      setFsError(err instanceof Error ? err.message : 'Save failed');
      setFsStatus('error');
    }
  }

  async function saveAnthropic(e: React.FormEvent) {
    e.preventDefault();
    setAiStatus('saving');
    setAiError('');
    try {
      // Save model always
      await fetch('/api/admin/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key: 'anthropic_model', value: model }),
      });
      // Save key only if the user typed something new
      if (apiKey.trim()) {
        const res = await fetch('/api/admin/settings', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ key: 'anthropic_api_key', value: apiKey.trim() }),
        });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Save failed');
        setApiKey('');
        setMaskedKey('(saved)');
      }
      setAiStatus('saved');
      setTimeout(() => setAiStatus('idle'), 3000);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Save failed');
      setAiStatus('error');
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
        <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* ── Anthropic / Claude ── */}
          <form onSubmit={saveAnthropic}>
            <section
              style={{
                padding: '1.25rem',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                background: '#fff',
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
                Claude / Anthropic
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--sepia)', marginBottom: '1.25rem' }}>
                Used for AI chat, narrative generation, and lineage stories across all trees.
              </p>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="ai-apikey">
                  API Key
                  {maskedKey && (
                    <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: 'var(--sepia)', fontSize: '0.8em' }}>
                      current: {maskedKey}
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    id="ai-apikey"
                    type={showApiKey ? 'text' : 'password'}
                    className="form-input"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={maskedKey ? 'Leave blank to keep current key' : 'sk-ant-…'}
                    autoComplete="new-password"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowApiKey(s => !s)} style={{ flexShrink: 0 }}>
                    {showApiKey ? 'Hide' : 'Reveal'}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="ai-model">Model</label>
                <select id="ai-model" className="form-select" value={model} onChange={e => setModel(e.target.value)}>
                  {MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={aiStatus === 'saving'}>
                {aiStatus === 'saving' ? 'Saving…' : 'Save'}
              </button>
              {aiStatus === 'saved' && <span style={{ color: 'var(--ink)', fontSize: '0.875rem' }}>Saved.</span>}
              {aiStatus === 'error'  && <span style={{ color: 'var(--rust)', fontSize: '0.875rem' }}>{aiError}</span>}
            </div>
          </form>

          {/* ── Email ── */}
          <form onSubmit={saveEmail}>
            <section
              style={{
                padding: '1.25rem',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                background: '#fff',
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
                Email (SMTP)
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--sepia)', marginBottom: '1.25rem' }}>
                Values set here override the{' '}
                <code style={{ fontSize: '0.8rem' }}>EMAIL_SERVER</code> /{' '}
                <code style={{ fontSize: '0.8rem' }}>EMAIL_FROM</code> environment variables.
              </p>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="email-server">
                  SMTP Server URL
                  {maskedServer && (
                    <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: 'var(--sepia)', fontSize: '0.8em' }}>
                      current: {maskedServer}
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    id="email-server"
                    type={showServer ? 'text' : 'password'}
                    className="form-input"
                    value={emailServer}
                    onChange={e => setEmailServer(e.target.value)}
                    placeholder={maskedServer ? 'Leave blank to keep current' : 'smtp://user:pass@host:587'}
                    autoComplete="new-password"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowServer(s => !s)} style={{ flexShrink: 0 }}>
                    {showServer ? 'Hide' : 'Reveal'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email-from">From Address</label>
                <input
                  id="email-from"
                  type="text"
                  className="form-input"
                  value={emailFrom}
                  onChange={e => setEmailFrom(e.target.value)}
                  placeholder='Family History <no-reply@example.com>'
                  autoComplete="off"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="email-bcc">
                  BCC Address
                  <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: 'var(--sepia)', fontSize: '0.8em' }}>
                    — receives a copy of every outgoing email (leave blank to disable)
                  </span>
                </label>
                <input
                  id="email-bcc"
                  type="text"
                  className="form-input"
                  value={emailBcc}
                  onChange={e => setEmailBcc(e.target.value)}
                  placeholder='you@example.com'
                  autoComplete="off"
                />
              </div>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={emailStatus === 'saving'}>
                {emailStatus === 'saving' ? 'Saving…' : 'Save'}
              </button>
              {emailStatus === 'saved' && <span style={{ color: 'var(--ink)', fontSize: '0.875rem' }}>Saved.</span>}
              {emailStatus === 'error'  && <span style={{ color: 'var(--rust)', fontSize: '0.875rem' }}>{emailError}</span>}
            </div>
          </form>

          {/* ── FamilySearch ── */}
          <form onSubmit={saveFamilySearch}>
            <section
              style={{
                padding: '1.25rem',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                background: '#fff',
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
                FamilySearch OAuth Credentials
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--sepia)', marginBottom: '1.25rem' }}>
                Values set here override the{' '}
                <code style={{ fontSize: '0.8rem' }}>FAMILYSEARCH_CLIENT_ID</code> /{' '}
                <code style={{ fontSize: '0.8rem' }}>FAMILYSEARCH_CLIENT_SECRET</code> environment variables.
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="fs-client-id">Client ID</label>
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
                <label className="form-label" htmlFor="fs-client-secret">Client Secret</label>
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
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSecret(s => !s)} style={{ flexShrink: 0 }}>
                    {showSecret ? 'Hide' : 'Reveal'}
                  </button>
                </div>
              </div>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={fsStatus === 'saving'}>
                {fsStatus === 'saving' ? 'Saving…' : 'Save'}
              </button>
              {fsStatus === 'saved' && <span style={{ color: 'var(--ink)', fontSize: '0.875rem' }}>Saved.</span>}
              {fsStatus === 'error'  && <span style={{ color: 'var(--rust)', fontSize: '0.875rem' }}>{fsError}</span>}
            </div>
          </form>

        </div>
      )}
    </div>
  );
}
