'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewTreePage() {
  const router = useRouter();

  // Tree fields
  const [name, setName]               = useState('');
  const [slug, setSlug]               = useState('');
  const [description, setDescription] = useState('');

  // Starting person fields
  const [personName, setPersonName]     = useState('');
  const [sex, setSex]                   = useState('');
  const [birthDate, setBirthDate]       = useState('');
  const [birthPlace, setBirthPlace]     = useState('');
  const [deathDate, setDeathDate]       = useState('');
  const [deathPlace, setDeathPlace]     = useState('');

  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError]   = useState('');

  // Auto-generate slug from tree name
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

  const hasPersonInfo = personName.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');

    try {
      // Step 1: Create the tree
      const treeRes = await fetch('/api/trees', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        name.trim(),
          slug:        slug.trim(),
          description: description.trim() || null,
        }),
      });

      if (!treeRes.ok) {
        const data = await treeRes.json().catch(() => ({}));
        setError(data.error ?? `${treeRes.status} ${treeRes.statusText}`);
        setStatus('error');
        return;
      }

      const tree = await treeRes.json();

      // Step 2: Create starting person if a name was provided
      if (hasPersonInfo) {
        const personRes = await fetch(`/api/trees/${tree.slug}/people`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            name:       personName.trim(),
            sex:        sex || null,
            birthDate:  birthDate.trim()  || null,
            birthPlace: birthPlace.trim() || null,
            deathDate:  deathDate.trim()  || null,
            deathPlace: deathPlace.trim() || null,
          }),
        });

        if (personRes.ok) {
          const person = await personRes.json();
          // Set as the default starting person for this tree
          await fetch(`/api/trees/${tree.slug}/settings`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ key: 'default_person_id', value: person.id }),
          });
          // Go straight to the tree view — they'll land on the person
          router.push(`/trees/${tree.slug}`);
          return;
        }
      }

      // No person — go to admin to finish setup
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
        <Link
          href="/home"
          style={{
            fontFamily: 'var(--font-sc)',
            fontSize: '0.82rem',
            color: 'var(--sepia)',
            textDecoration: 'none',
          }}
        >
          &larr; Home
        </Link>
      </header>

      <main style={{ maxWidth: 560, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
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

          {/* ── Tree details ── */}
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label" htmlFor="nt-name">Tree name *</label>
              <input
                id="nt-name"
                className="form-input"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Smith Family"
                required
                autoFocus
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="nt-slug">
                URL slug *
                <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: 'var(--sepia)', fontSize: '0.8em' }}>
                  letters, numbers, and hyphens only
                </span>
              </label>
              <input
                id="nt-slug"
                className="form-input"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="smith-family"
                pattern="[a-z0-9][a-z0-9-]*[a-z0-9]|[a-z0-9]"
                title="Lowercase letters, numbers, and hyphens."
                required
              />
              {slug && (
                <p style={{ fontSize: '0.78rem', color: 'var(--sepia)', marginTop: '0.3rem' }}>
                  URL: /trees/{slug}/
                </p>
              )}
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="nt-description">
                Description
                <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: 'var(--sepia)', fontSize: '0.8em' }}>optional</span>
              </label>
              <textarea
                id="nt-description"
                className="form-textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="A brief description of this family tree…"
              />
            </div>
          </div>

          {/* ── Starting person ── */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.75rem',
              borderTop: '1px solid var(--border-light)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-sc)',
                fontSize: '0.72rem',
                letterSpacing: '0.09em',
                color: 'var(--sepia)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              Starting person
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--sepia)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Optional. Enter the first person to add to this tree — you can add more later.
            </p>

            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label" htmlFor="p-name">Full name</label>
                <input
                  id="p-name"
                  className="form-input"
                  value={personName}
                  onChange={e => setPersonName(e.target.value)}
                  placeholder="First Last"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="p-sex">Sex</label>
                <select
                  id="p-sex"
                  className="form-select"
                  value={sex}
                  onChange={e => setSex(e.target.value)}
                >
                  <option value="">Unknown</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="p-birth-date">Birth date</label>
                <input
                  id="p-birth-date"
                  className="form-input"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  placeholder="e.g. 14 Mar 1842"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label" htmlFor="p-birth-place">Birth place</label>
                <input
                  id="p-birth-place"
                  className="form-input"
                  value={birthPlace}
                  onChange={e => setBirthPlace(e.target.value)}
                  placeholder="e.g. Luxembourg City, Luxembourg"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="p-death-date">Death date</label>
                <input
                  id="p-death-date"
                  className="form-input"
                  value={deathDate}
                  onChange={e => setDeathDate(e.target.value)}
                  placeholder="e.g. 2 Nov 1901"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label" htmlFor="p-death-place">Death place</label>
                <input
                  id="p-death-place"
                  className="form-input"
                  value={deathPlace}
                  onChange={e => setDeathPlace(e.target.value)}
                  placeholder="e.g. San Antonio, Texas"
                />
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          {status === 'error' && (
            <p style={{ color: 'var(--rust)', margin: '1rem 0 0', fontSize: '0.9rem' }}>
              {error}
            </p>
          )}

          <div className="form-actions" style={{ marginTop: '1.75rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === 'saving'}
            >
              {status === 'saving'
                ? 'Creating…'
                : hasPersonInfo
                  ? `Create tree & add ${personName.trim().split(' ')[0]}`
                  : 'Create tree'}
            </button>
            <Link href="/home" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
