'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTreePage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');

  // Auto-generate slug from name
  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === toSlug(name)) {
      setSlug(toSlug(value));
    }
  }

  function toSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');

    try {
      const res = await fetch('/api/trees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `${res.status} ${res.statusText}`);
        setStatus('error');
        return;
      }

      const tree = await res.json();
      router.push(`/trees/${tree.slug}/admin`);
    } catch {
      setError('Network error — please try again');
      setStatus('error');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--parchment)' }}>
      <header
        style={{
          borderBottom: '1px solid var(--border-light)',
          padding: '0.75rem 2rem',
          background: 'var(--parchment)',
        }}
      >
        <a
          href="/dashboard"
          style={{
            fontFamily: 'var(--font-sc)',
            fontSize: '0.82rem',
            color: 'var(--sepia)',
            textDecoration: 'none',
          }}
        >
          &larr; Back to dashboard
        </a>
      </header>

      <main style={{ maxWidth: 540, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem',
            color: 'var(--ink)',
            marginBottom: '2rem',
          }}
        >
          Create a new tree
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label" htmlFor="nt-name">
                Tree name *
              </label>
              <input
                id="nt-name"
                className="form-input"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Gaasch Family"
                required
                autoFocus
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="nt-slug">
                URL slug *
                <span
                  style={{
                    fontWeight: 400,
                    marginLeft: '0.5rem',
                    color: 'var(--sepia)',
                    fontSize: '0.8em',
                  }}
                >
                  letters, numbers, and hyphens only
                </span>
              </label>
              <input
                id="nt-slug"
                className="form-input"
                value={slug}
                onChange={e =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                placeholder="gaasch-family"
                pattern="[a-z0-9][a-z0-9-]*[a-z0-9]|[a-z0-9]"
                title="Lowercase letters, numbers, and hyphens. Must start and end with a letter or number."
                required
              />
              {slug && (
                <p
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--sepia)',
                    marginTop: '0.3rem',
                  }}
                >
                  URL: /trees/{slug}/
                </p>
              )}
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="nt-description">
                Description
                <span
                  style={{
                    fontWeight: 400,
                    marginLeft: '0.5rem',
                    color: 'var(--sepia)',
                    fontSize: '0.8em',
                  }}
                >
                  optional
                </span>
              </label>
              <textarea
                id="nt-description"
                className="form-textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="A brief description of this family tree…"
              />
            </div>
          </div>

          {status === 'error' && (
            <p
              style={{
                color: 'var(--rust)',
                marginBottom: '0.75rem',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </p>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === 'saving'}
            >
              {status === 'saving' ? 'Creating…' : 'Create tree'}
            </button>
            <a href="/dashboard" className="btn btn-secondary">
              Cancel
            </a>
          </div>
        </form>
      </main>
    </div>
  );
}
