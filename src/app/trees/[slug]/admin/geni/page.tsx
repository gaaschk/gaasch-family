'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function GeniPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const treeSlug     = params.slug as string;

  const [connected, setConnected]     = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState('');

  const geniError     = searchParams.get('geni_error');
  const geniConnected = searchParams.get('geni_connected');

  // Load connection status
  useEffect(() => {
    fetch(`/api/trees/${treeSlug}/geni?status=1`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { connected: boolean; displayName: string | null }) => {
        setConnected(d.connected);
        setDisplayName(d.displayName);
      })
      .catch(() => setConnected(false));
  }, [treeSlug, geniConnected]);

  async function disconnect() {
    setDisconnectError('');
    const res = await fetch(`/api/trees/${treeSlug}/geni`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setDisconnectError(data.error ?? 'Disconnect failed');
      return;
    }
    setConnected(false);
    setDisplayName(null);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Geni</h1>
      </div>

      <section style={{ maxWidth: 520, marginBottom: '2.5rem' }}>
        <p className="section-title" style={{ marginBottom: '0.75rem' }}>
          Account Connection
        </p>

        {geniError && (
          <p style={{ color: 'var(--rust)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Geni error: {geniError}
          </p>
        )}
        {geniConnected && (
          <p style={{ color: 'var(--ink)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Connected successfully.
          </p>
        )}

        {connected === null && (
          <p style={{ color: 'var(--sepia)', fontSize: '0.85rem' }}>Checking…</p>
        )}

        {connected === false && (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--sepia)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Connect your Geni account to search Geni profiles when looking for record hints for people in this tree.
            </p>
            <a
              href={`/api/auth/geni?treeSlug=${treeSlug}`}
              className="btn btn-primary"
              style={{ display: 'inline-block', textDecoration: 'none' }}
            >
              Connect Geni
            </a>
          </>
        )}

        {connected === true && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '0.85rem', color: 'var(--ink)',
                }}
              >
                <span style={{ color: '#4caf50', fontSize: '0.7rem' }}>●</span>
                Connected{displayName ? ` as ${displayName}` : ''}
              </span>
              <button
                className="btn"
                style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                onClick={disconnect}
              >
                Disconnect
              </button>
            </div>
            {disconnectError && (
              <p style={{ color: 'var(--rust)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {disconnectError}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
