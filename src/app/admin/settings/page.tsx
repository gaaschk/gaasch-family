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

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Setting[]) => {
        const k = data.find(s => s.key === 'anthropic_api_key');
        const m = data.find(s => s.key === 'anthropic_model');
        if (k) setMaskedKey(k.value);
        if (m) setModel(m.value);
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
    </div>
  );
}
