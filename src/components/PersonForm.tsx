'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Person } from '@/types';

interface PersonFormProps {
  person?: Person;
  nextId?: string;
}

export default function PersonForm({ person, nextId }: PersonFormProps) {
  const router = useRouter();
  const isNew = !person;

  const [fields, setFields] = useState({
    id:          person?.id          ?? nextId ?? '',
    name:        person?.name        ?? '',
    sex:         person?.sex         ?? '',
    birthDate:   person?.birthDate   ?? '',
    birthPlace:  person?.birthPlace  ?? '',
    deathDate:   person?.deathDate   ?? '',
    deathPlace:  person?.deathPlace  ?? '',
    burialDate:  person?.burialDate  ?? '',
    burialPlace: person?.burialPlace ?? '',
    occupation:  person?.occupation  ?? '',
    notes:       person?.notes       ?? '',
    narrative:   person?.narrative   ?? '',
  });

  const [status, setStatus]         = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError]           = useState('');
  const [genStatus, setGenStatus]   = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [genError, setGenError]     = useState('');

  function set(field: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFields(f => ({ ...f, [field]: e.target.value }));
  }

  async function generateNarrative() {
    if (!person?.id) return;
    setGenStatus('generating');
    setGenError('');
    setFields(f => ({ ...f, narrative: '' }));

    try {
      const res = await fetch(`/api/people/${encodeURIComponent(person.id)}/generate-narrative`, {
        method: 'POST',
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setGenError(data.error ?? `${res.status} ${res.statusText}`);
        setGenStatus('error');
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        // Surface any error the server embedded in the stream
        if (text.includes('__ERROR__:')) {
          const msg = text.split('__ERROR__:')[1]?.trim() ?? 'Generation failed';
          setGenError(msg);
          setGenStatus('error');
          setFields(f => ({ ...f, narrative: '' }));
          return;
        }
        setFields(f => ({ ...f, narrative: text }));
      }

      setGenStatus('done');
    } catch {
      setGenError('Network error — check server logs');
      setGenStatus('error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');

    const url     = isNew ? '/api/people' : `/api/people/${person!.id}`;
    const method  = isNew ? 'POST' : 'PATCH';

    const body = isNew
      ? fields
      : {
          name:        fields.name,
          sex:         fields.sex        || null,
          birthDate:   fields.birthDate  || null,
          birthPlace:  fields.birthPlace || null,
          deathDate:   fields.deathDate  || null,
          deathPlace:  fields.deathPlace || null,
          burialDate:  fields.burialDate || null,
          burialPlace: fields.burialPlace || null,
          occupation:  fields.occupation || null,
          notes:       fields.notes      || null,
          narrative:   fields.narrative  || null,
        };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `${res.status} ${res.statusText}`);
      setStatus('error');
      return;
    }

    router.push('/admin/people');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        {isNew && (
          <div className="form-group">
            <label className="form-label" htmlFor="pf-id">ID</label>
            <input
              id="pf-id"
              className="form-input"
              value={fields.id}
              onChange={set('id')}
              placeholder="@I500001@"
              required
            />
          </div>
        )}

        <div className="form-group" style={isNew ? {} : { gridColumn: '1 / -1' }}>
          <label className="form-label" htmlFor="pf-name">Name *</label>
          <input
            id="pf-name"
            className="form-input"
            value={fields.name}
            onChange={set('name')}
            placeholder="Jean /Gaasch/"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pf-sex">Sex</label>
          <select id="pf-sex" className="form-select" value={fields.sex} onChange={set('sex')}>
            <option value="">— Unknown —</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pf-occupation">Occupation</label>
          <input
            id="pf-occupation"
            className="form-input"
            value={fields.occupation}
            onChange={set('occupation')}
            placeholder="Farmer"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pf-birth-date">Birth Date</label>
          <input
            id="pf-birth-date"
            className="form-input"
            value={fields.birthDate}
            onChange={set('birthDate')}
            placeholder="c. 1698"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pf-birth-place">Birth Place</label>
          <input
            id="pf-birth-place"
            className="form-input"
            value={fields.birthPlace}
            onChange={set('birthPlace')}
            placeholder="Alzingen, Luxembourg"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pf-death-date">Death Date</label>
          <input
            id="pf-death-date"
            className="form-input"
            value={fields.deathDate}
            onChange={set('deathDate')}
            placeholder="May 8, 1743"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pf-death-place">Death Place</label>
          <input
            id="pf-death-place"
            className="form-input"
            value={fields.deathPlace}
            onChange={set('deathPlace')}
            placeholder="Alzingen, Luxembourg"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pf-burial-date">Burial Date</label>
          <input
            id="pf-burial-date"
            className="form-input"
            value={fields.burialDate}
            onChange={set('burialDate')}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pf-burial-place">Burial Place</label>
          <input
            id="pf-burial-place"
            className="form-input"
            value={fields.burialPlace}
            onChange={set('burialPlace')}
          />
        </div>

        <div className="form-group full-width">
          <label className="form-label" htmlFor="pf-notes">Notes</label>
          <textarea
            id="pf-notes"
            className="form-textarea"
            value={fields.notes}
            onChange={set('notes')}
            rows={4}
          />
        </div>

        <div className="form-group full-width">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <label className="form-label" htmlFor="pf-narrative" style={{ margin: 0 }}>
              Narrative
              <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: 'var(--sepia)', fontSize: '0.8em' }}>
                HTML — renders on the public tree explorer page
              </span>
            </label>
            {!isNew && (
              <button
                type="button"
                onClick={generateNarrative}
                disabled={genStatus === 'generating' || status === 'saving'}
                style={{
                  marginLeft: 'auto',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.8rem',
                  background: genStatus === 'generating' ? 'var(--border-light)' : 'var(--ink)',
                  color: '#f5f0e8',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: genStatus === 'generating' ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sc)',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {genStatus === 'generating' ? 'Generating…' : '✦ Generate with Claude'}
              </button>
            )}
          </div>
          {genStatus === 'done' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--sepia)', marginBottom: '0.4rem' }}>
              ✓ Generated and saved — edit below if needed, then Save changes to update further.
            </p>
          )}
          {genStatus === 'error' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--rust)', marginBottom: '0.4rem' }}>
              Generation failed: {genError}
            </p>
          )}
          <textarea
            id="pf-narrative"
            className="form-textarea"
            value={fields.narrative}
            onChange={set('narrative')}
            rows={16}
            placeholder={'<div class="chapter-header">\n  <span class="chapter-num">Generation One</span>\n  <h2>Jean Gaasch</h2>\n  <p class="chapter-meta">c. 1698 – May 8, 1743</p>\n</div>\n<p class="body-text">…</p>'}
            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {status === 'error' && (
        <p style={{ color: 'var(--rust)', marginTop: '0.75rem' }}>{error}</p>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : isNew ? 'Create person' : 'Save changes'}
        </button>
        <a href="/admin/people" className="btn btn-secondary">Cancel</a>
      </div>
    </form>
  );
}
