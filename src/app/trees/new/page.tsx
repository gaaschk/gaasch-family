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
  const firstName = personName.trim().split(' ')[0] || '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');

    try {
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
          await fetch(`/api/trees/${tree.slug}/settings`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ key: 'default_person_id', value: person.id }),
          });
          router.push(`/trees/${tree.slug}`);
          return;
        }
      }

      router.push(`/trees/${tree.slug}/admin`);
    } catch {
      setError('Network error — please try again');
      setStatus('error');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f4f0', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e8e0d8',
        padding: '0 32px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 700, color: '#2c1810', letterSpacing: -0.5, textDecoration: 'none' }}>
          heir<span style={{ color: '#8b5e3c' }}>loom</span>
        </Link>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#8b5e3c', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600,
        }}>U</div>
      </nav>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          gap: 32,
          maxWidth: 1000,
          width: '100%',
          alignItems: 'start',
        }}>
          {/* Form panel */}
          <div style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e8e0d8',
            padding: 32,
          }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Create your tree</h1>
            <p style={{ fontSize: 14, color: '#7a6a5a', marginBottom: 24 }}>
              Start with yourself — we&apos;ll help you work backwards.
            </p>

            {/* Progress bar */}
            <div style={{ background: '#e8e0d8', borderRadius: 4, height: 6, marginBottom: 24 }}>
              <div style={{ background: '#8b5e3c', borderRadius: 4, height: 6, width: '33%' }} />
            </div>

            <form onSubmit={handleSubmit}>
              {/* Tree name */}
              <div style={{
                background: '#fdf6ef',
                border: '1px solid #e8d8c8',
                borderRadius: 10,
                padding: 14,
                marginBottom: 20,
              }}>
                <label htmlFor="nt-name" style={{ fontSize: 13, fontWeight: 600, color: '#8b5e3c', marginBottom: 6, display: 'block' }}>
                  Tree name
                </label>
                <input
                  id="nt-name"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Smith Family Tree"
                  required
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1px solid #e8e0d8', fontSize: 14, background: 'white', color: '#2c1810',
                  }}
                />
                {slug && (
                  <p style={{ fontSize: 12, color: '#9a8a7a', marginTop: 3 }}>
                    URL: /trees/{slug}/
                  </p>
                )}
              </div>

              {/* Hidden slug input for submission */}
              <input type="hidden" value={slug} />
              <input type="hidden" value={description} />

              {/* About you */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  About you
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#e6f9f1', color: '#0d7a52' }}>
                    Step 1 of 3
                  </span>
                </h3>

                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="p-name" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2c1810', marginBottom: 4 }}>
                    Full name
                  </label>
                  <input
                    id="p-name"
                    value={personName}
                    onChange={e => setPersonName(e.target.value)}
                    placeholder="First Last"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid #e8e0d8', fontSize: 14, background: 'white', color: '#2c1810',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label htmlFor="p-birth-date" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2c1810', marginBottom: 4 }}>
                      Birth date
                    </label>
                    <input
                      id="p-birth-date"
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      placeholder="e.g. 14 Mar 1985"
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: '1px solid #e8e0d8', fontSize: 14, background: 'white', color: '#2c1810',
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="p-birth-place" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2c1810', marginBottom: 4 }}>
                      Birthplace
                    </label>
                    <input
                      id="p-birth-place"
                      value={birthPlace}
                      onChange={e => setBirthPlace(e.target.value)}
                      placeholder="e.g. Pittsburgh, PA"
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: '1px solid #e8e0d8', fontSize: 14, background: 'white', color: '#2c1810',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="p-sex" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2c1810', marginBottom: 4 }}>
                    Gender
                  </label>
                  <select
                    id="p-sex"
                    value={sex}
                    onChange={e => setSex(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid #e8e0d8', fontSize: 14, background: 'white', color: '#2c1810',
                    }}
                  >
                    <option value="">Unknown</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>

              {/* EU hint */}
              <div style={{
                background: 'linear-gradient(135deg, #fdf6ef, #f0ebe3)',
                border: '1px solid #e8d8c8',
                borderRadius: 10,
                padding: '14px 16px',
                marginTop: 20,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>🇪🇺</span>
                <div style={{ fontSize: 13, color: '#5c3c1c', lineHeight: 1.5 }}>
                  <strong style={{ display: 'block', marginBottom: 2 }}>Tip: Add as many generations as you can</strong>
                  Most citizenship-by-descent paths require 2-5 generations. The more you add now, the sooner we can scan for eligibility.
                </div>
              </div>

              {status === 'error' && (
                <p style={{ color: '#b91c2a', margin: '16px 0 0', fontSize: 14 }}>{error}</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <Link href="/home" style={{ padding: '11px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#7a6a5a', textDecoration: 'none' }}>
                  &larr; Back
                </Link>
                <button
                  type="submit"
                  disabled={status === 'saving'}
                  style={{
                    padding: '11px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: '#8b5e3c', color: 'white', border: 'none', cursor: 'pointer',
                    opacity: status === 'saving' ? 0.6 : 1,
                  }}
                >
                  {status === 'saving'
                    ? 'Creating...'
                    : hasPersonInfo
                      ? `Create tree & add ${firstName}`
                      : 'Create tree'}
                  {status !== 'saving' && ' \u2192'}
                </button>
              </div>
            </form>
          </div>

          {/* Preview panel */}
          <div style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e8e0d8',
            overflow: 'hidden',
            position: 'sticky',
            top: 80,
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f0ebe3',
              fontSize: 13,
              fontWeight: 600,
              color: '#9a8a7a',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              Live preview
            </div>
            <div style={{
              padding: 32,
              minHeight: 400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* Simple tree preview */}
              <div style={{ textAlign: 'center' }}>
                {/* Parent placeholders */}
                <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginBottom: 0 }}>
                  <div style={{
                    border: '2px dashed #c8b8a8',
                    borderRadius: 8,
                    padding: '10px 16px',
                    display: 'inline-block',
                  }}>
                    <div style={{ fontSize: 10, color: '#8b5e3c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                      Father
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#c8b8a8' }}>Add name...</div>
                  </div>
                  <div style={{
                    border: '2px dashed #c8b8a8',
                    borderRadius: 8,
                    padding: '10px 16px',
                    display: 'inline-block',
                  }}>
                    <div style={{ fontSize: 10, color: '#8b5e3c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                      Mother
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#c8b8a8' }}>Add name...</div>
                  </div>
                </div>

                {/* Connector */}
                <div style={{ width: 2, height: 24, background: '#e8e0d8', margin: '4px auto' }} />

                {/* You node */}
                <div style={{
                  border: '2px solid #8b5e3c',
                  background: '#fdf6ef',
                  borderRadius: 8,
                  padding: '10px 16px',
                  display: 'inline-block',
                }}>
                  <div style={{ fontSize: 10, color: '#8b5e3c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                    You
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2c1810' }}>
                    {personName || 'Your Name'}
                  </div>
                  {(birthDate || birthPlace) && (
                    <div style={{ fontSize: 11, color: '#9a8a7a' }}>
                      {birthDate && `b. ${birthDate}`}{birthDate && birthPlace ? ' \u00b7 ' : ''}{birthPlace}
                    </div>
                  )}
                </div>
              </div>

              <p style={{ fontSize: 12, color: '#9a8a7a', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
                Your tree grows as you add people.<br />
                We&apos;ll scan it for citizenship paths automatically.
              </p>

              <div style={{
                background: '#f0fdf6',
                border: '1px solid #c8f0d8',
                borderRadius: 8,
                padding: '12px 16px',
                marginTop: 20,
                textAlign: 'center',
                fontSize: 12,
                color: '#0d7a52',
              }}>
                <strong style={{ display: 'block', marginBottom: 2, fontSize: 13 }}>
                  🇪🇺 Eligibility scan
                </strong>
                Add 2+ more generations to unlock your first eligibility report.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
