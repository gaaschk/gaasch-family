'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import type { FsSearchEntry, FsPersonSummary } from '@/lib/familysearch';

function lifespan(p: FsPersonSummary) {
  const b = p.birthDate?.match(/\d{4}/)?.[0] ?? '';
  const d = p.deathDate?.match(/\d{4}/)?.[0] ?? '';
  if (b && d) return `${b}–${d}`;
  if (b) return `b. ${b}`;
  if (d) return `d. ${d}`;
  return '';
}

export default function FamilySearchPage() {
  const params      = useParams();
  const searchParams = useSearchParams();
  const treeSlug    = params.slug as string;

  const [connected, setConnected]   = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const [query, setQuery]           = useState('');
  const [searching, setSearching]   = useState(false);
  const [results, setResults]       = useState<FsSearchEntry[]>([]);
  const [searchError, setSearchError] = useState('');

  const [selected, setSelected]     = useState<FsSearchEntry | null>(null);
  const [generations, setGenerations] = useState(4);
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState<{ people: number; families: number } | null>(null);
  const [importError, setImportError] = useState('');
  const [disconnectError, setDisconnectError] = useState('');

  const fsError    = searchParams.get('fs_error');
  const fsConnected = searchParams.get('fs_connected');

  // Load connection status
  useEffect(() => {
    fetch(`/api/trees/${treeSlug}/familysearch?status=1`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { connected: boolean; displayName: string | null }) => {
        setConnected(d.connected);
        setDisplayName(d.displayName);
      })
      .catch(() => setConnected(false));
  }, [treeSlug, fsConnected]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setSearchError('');
    setSelected(null);
    setImportResult(null);
    try {
      const res = await fetch(
        `/api/trees/${treeSlug}/familysearch?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (!res.ok) { setSearchError(data.error ?? 'Search failed'); return; }
      setResults(data.results ?? []);
      if (data.results?.length === 0) setSearchError('No results found.');
    } catch {
      setSearchError('Network error');
    } finally {
      setSearching(false);
    }
  }

  async function doImport() {
    if (!selected) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const res = await fetch(`/api/trees/${treeSlug}/familysearch/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: selected.person.pid, generations }),
      });
      const data = await res.json();
      if (!res.ok) { setImportError(data.error ?? 'Import failed'); return; }
      setImportResult(data.imported);
    } catch {
      setImportError('Network error');
    } finally {
      setImporting(false);
    }
  }

  async function disconnect() {
    setDisconnectError('');
    const res = await fetch(`/api/trees/${treeSlug}/familysearch`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setDisconnectError(data.error ?? 'Disconnect failed');
      return;
    }
    setConnected(false);
    setDisplayName(null);
    setResults([]);
    setSelected(null);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">FamilySearch</h1>
      </div>

      {/* Connection status */}
      <section style={{ maxWidth: 520, marginBottom: '2.5rem' }}>
        <p className="section-title" style={{ marginBottom: '0.75rem' }}>
          Account Connection
        </p>

        {fsError && (
          <p style={{ color: 'var(--rust)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            FamilySearch error: {fsError}
          </p>
        )}
        {fsConnected && (
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
              Connect your FamilySearch account to search and import people directly into this tree.
            </p>
            <a
              href={`/api/auth/familysearch?treeSlug=${treeSlug}`}
              className="btn btn-primary"
              style={{ display: 'inline-block', textDecoration: 'none' }}
            >
              Connect FamilySearch
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

      {/* Search */}
      {connected === true && (
        <section style={{ maxWidth: 640 }}>
          <p className="section-title" style={{ marginBottom: '0.75rem' }}>
            Search &amp; Import
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--sepia)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Search FamilySearch by name. Select a person to import them and their
            ancestors into this tree.
          </p>

          <form onSubmit={search} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1 }}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name…"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary" disabled={searching || !query.trim()}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {searchError && (
            <p style={{ color: 'var(--rust)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {searchError}
            </p>
          )}

          {/* Results list */}
          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {results.map(entry => {
                const isSelected = selected?.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    onClick={() => { setSelected(isSelected ? null : entry); setImportResult(null); setImportError(''); }}
                    style={{
                      display:     'flex',
                      alignItems:  'center',
                      gap:         '0.75rem',
                      padding:     '0.65rem 0.9rem',
                      border:      `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                      borderRadius: 5,
                      background:  isSelected ? 'rgba(196,150,42,0.07)' : 'var(--parchment)',
                      cursor:      'pointer',
                      textAlign:   'left',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>
                        {entry.person.name}
                      </span>
                      {lifespan(entry.person) && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--sepia)', marginLeft: '0.5rem' }}>
                          {lifespan(entry.person)}
                        </span>
                      )}
                      {entry.person.birthPlace && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--sepia)', marginLeft: '0.4rem' }}>
                          · {entry.person.birthPlace}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--sepia)', fontFamily: 'var(--font-mono)' }}>
                      {entry.person.pid}
                    </span>
                    {isSelected && <span style={{ color: 'var(--gold)' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Import panel */}
          {selected && (
            <div
              style={{
                border:       '1px solid var(--gold)',
                borderRadius: 6,
                padding:      '1.25rem',
                background:   'rgba(196,150,42,0.04)',
                marginBottom: '1rem',
              }}
            >
              <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                Import: {selected.person.name}
                {lifespan(selected.person) && (
                  <span style={{ fontWeight: 400, color: 'var(--sepia)', marginLeft: '0.5rem', fontSize: '0.82rem' }}>
                    {lifespan(selected.person)}
                  </span>
                )}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--sepia)' }}>
                  Ancestor generations:
                </label>
                <select
                  className="form-select"
                  style={{ width: 'auto' }}
                  value={generations}
                  onChange={e => setGenerations(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={doImport}
                disabled={importing}
              >
                {importing ? 'Importing…' : 'Import into tree'}
              </button>

              {importError && (
                <p style={{ color: 'var(--rust)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                  {importError}
                </p>
              )}
              {importResult && (
                <p style={{ color: 'var(--ink)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                  Imported {importResult.people.toLocaleString()} people and{' '}
                  {importResult.families.toLocaleString()} families.
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
