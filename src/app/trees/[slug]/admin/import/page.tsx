'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function TreeImportPage() {
  const params = useParams();
  const treeSlug = params.slug as string;

  const [exportLoading, setExportLoading] = useState(false);

  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ people: number; families: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setResult(null);
    setErrorMsg(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`/api/trees/${treeSlug}/import/gedcom`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error ?? 'Import failed');
      } else {
        setStatus('done');
        setResult(data.imported);
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error — check server logs');
    }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/trees/${treeSlug}/export/gedcom`);
      if (!res.ok) return;
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${treeSlug}.ged`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Import / Export</h1>
      </div>

      {/* Export */}
      <section
        style={{
          marginBottom: '2.5rem',
          paddingBottom: '2.5rem',
          borderBottom: '1px solid var(--border-light)',
          maxWidth: 480,
        }}
      >
        <p className="section-title" style={{ marginBottom: '0.5rem' }}>
          Export GEDCOM
        </p>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--sepia)',
            marginBottom: '1.25rem',
            lineHeight: 1.6,
          }}
        >
          Download all people and family records as a standard GEDCOM 5.5.1
          file, compatible with any genealogy application.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={exportLoading}
          onClick={handleExport}
        >
          {exportLoading ? 'Generating\u2026' : 'Download GEDCOM'}
        </button>
      </section>

      {/* Import */}
      <p className="section-title" style={{ marginBottom: '1.25rem' }}>
        Import GEDCOM
      </p>

      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="ged-file"
            style={{ display: 'block', marginBottom: '0.4rem' }}
          >
            GEDCOM file (.ged)
          </label>
          <input
            ref={fileRef}
            id="ged-file"
            type="file"
            accept=".ged,.gedcom"
            required
          />
        </div>

        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--sepia)',
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}
        >
          People and family records will be added or updated from the file.
          Existing <strong>narrative</strong> content written on the site will be
          preserved. Family membership is fully synced from the GEDCOM.
        </p>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={status === 'uploading'}
        >
          {status === 'uploading' ? 'Importing\u2026' : 'Import'}
        </button>

        {status === 'done' && result && (
          <p
            style={{
              color: 'var(--ink)',
              marginTop: '1.25rem',
              fontSize: '0.9rem',
            }}
          >
            Imported {result.people.toLocaleString()} people and{' '}
            {result.families.toLocaleString()} families.
          </p>
        )}
        {status === 'error' && (
          <p
            style={{
              color: 'var(--rust)',
              marginTop: '1.25rem',
              fontSize: '0.9rem',
            }}
          >
            Error: {errorMsg}
          </p>
        )}
      </form>
    </div>
  );
}
