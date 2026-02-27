'use client';

import { useState, useEffect } from 'react';

type Setting = { key: string; value: string };

const MODELS = [
  { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6 (recommended)' },
  { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6 (highest quality)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest / cheapest)' },
];

export default function SettingsPage() {
  const [apiKey, setApiKey]       = useState('');
  const [model, setModel]         = useState('claude-sonnet-4-6');
  const [maskedKey, setMaskedKey] = useState('');
  const [status, setStatus]       = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError]         = useState('');

  // API token state
  const [hasToken, setHasToken]       = useState(false);
  const [newToken, setNewToken]       = useState('');
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'generating' | 'copied'>('idle');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Setting[]) => {
        const k = data.find(s => s.key === 'anthropic_api_key');
        const m = data.find(s => s.key === 'anthropic_model');
        const t = data.find(s => s.key === 'api_token');
        if (k) setMaskedKey(k.value);
        if (m) setModel(m.value);
        if (t) setHasToken(true);
      })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');

    try {
      // Save model always
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'anthropic_model', value: model }),
      });

      // Save API key only if user typed something
      if (apiKey.trim()) {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'anthropic_api_key', value: apiKey.trim() }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
        setApiKey('');
        setMaskedKey('(saved)');
      }

      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setStatus('error');
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Settings</h1>
      </div>

      <form onSubmit={save} style={{ maxWidth: 520 }}>
        <section style={{ marginBottom: '2rem' }}>
          <p className="section-title" style={{ marginBottom: '1.25rem' }}>Claude / Anthropic</p>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="s-apikey">
              API Key
              {maskedKey && (
                <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: 'var(--sepia)', fontSize: '0.8em' }}>
                  current: {maskedKey}
                </span>
              )}
            </label>
            <input
              id="s-apikey"
              type="password"
              className="form-input"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={maskedKey ? 'Leave blank to keep current key' : 'sk-ant-…'}
              autoComplete="off"
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--sepia)', marginTop: '0.3rem' }}>
              Get your key at{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--rust)' }}>
                console.anthropic.com
              </a>
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="s-model">Model</label>
            <select
              id="s-model"
              className="form-select"
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </section>

        {status === 'error' && (
          <p style={{ color: 'var(--rust)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{error}</p>
        )}
        {status === 'saved' && (
          <p style={{ color: 'var(--ink)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Settings saved</p>
        )}

        <button type="submit" className="btn btn-primary" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving...' : 'Save settings'}
        </button>
      </form>

      {/* ── API Access Token ── */}
      <section style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)', maxWidth: 520 }}>
        <p className="section-title" style={{ marginBottom: '0.5rem' }}>API Access Token</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--sepia)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          Use this token to call{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em', background: 'rgba(0,0,0,0.05)', padding: '0 0.25em', borderRadius: 3 }}>
            POST /api/people/&#123;id&#125;/generate-narrative
          </code>{' '}
          from scripts or external tools without a browser session.
          Pass it as{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em', background: 'rgba(0,0,0,0.05)', padding: '0 0.25em', borderRadius: 3 }}>
            Authorization: Bearer &lt;token&gt;
          </code>.
        </p>

        {newToken ? (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--rust)', marginBottom: '0.4rem' }}>
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
            <p style={{ fontSize: '0.82rem', color: 'var(--sepia)', marginBottom: '1rem' }}>
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
            await fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'api_token', value: token }),
            });
            setNewToken(token);
            setHasToken(true);
            setTokenStatus('idle');
          }}
        >
          {tokenStatus === 'generating' ? 'Generating…' : hasToken ? 'Regenerate token' : 'Generate token'}
        </button>
      </section>
    </div>
  );
}
