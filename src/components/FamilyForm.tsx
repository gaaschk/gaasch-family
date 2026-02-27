'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PersonSearch from './PersonSearch';
import type { Family, Person } from '@/types';

interface FamilyFormProps {
  treeSlug: string;
  family?: Family & {
    husband?: Person | null;
    wife?: Person | null;
    children?: { familyId?: string; personId?: string; person?: Person }[];
  };
}

export default function FamilyForm({ treeSlug, family }: FamilyFormProps) {
  const router = useRouter();
  const isNew = !family;

  const [husband, setHusband] = useState<Person | null>(family?.husband ?? null);
  const [wife, setWife] = useState<Person | null>(family?.wife ?? null);
  const [marrDate, setMarrDate] = useState(family?.marrDate ?? '');
  const [marrPlace, setMarrPlace] = useState(family?.marrPlace ?? '');

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => { setDirty(true); setter(v); };
  }

  const [children, setChildren] = useState<Person[]>(() => {
    if (!family?.children) return [];
    return family.children.flatMap(c => (c.person ? [c.person] : []));
  });
  const [childToAdd, setChildToAdd] = useState<Person | null>(null);

  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');

  function addChild(p: Person | null) {
    if (!p) return;
    if (children.some(c => c.id === p.id)) return;
    setDirty(true);
    setChildren(prev => [...prev, p]);
    setChildToAdd(null);
  }

  function removeChild(id: string) {
    setDirty(true);
    setChildren(prev => prev.filter(c => c.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');

    const url    = isNew
      ? `/api/trees/${treeSlug}/families`
      : `/api/trees/${treeSlug}/families/${family!.id}`;
    const method = isNew ? 'POST' : 'PATCH';

    const payload = {
      husbId:    husband?.id ?? null,
      wifeId:    wife?.id    ?? null,
      marrDate:  marrDate  || null,
      marrPlace: marrPlace || null,
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `${res.status} ${res.statusText}`);
      setStatus('error');
      return;
    }

    const saved = await res.json();
    const familyId = saved.id;

    // Sync children
    const existing = family?.children?.flatMap(c => c.person ? [c.person.id] : []) ?? [];
    const desired  = children.map(c => c.id);
    const toAdd    = desired.filter(id => !existing.includes(id));
    const toRemove = existing.filter(id => !desired.includes(id));

    if (toAdd.length > 0 || toRemove.length > 0) {
      await fetch(`/api/trees/${treeSlug}/families/${familyId}/children`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: toAdd, remove: toRemove }),
      });
    }

    router.push(`/trees/${treeSlug}/admin/families`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <PersonSearch
            treeSlug={treeSlug}
            label="Husband"
            value={husband}
            onChange={markDirty(setHusband)}
            placeholder="Search for husband…"
          />
        </div>

        <div className="form-group">
          <PersonSearch
            treeSlug={treeSlug}
            label="Wife"
            value={wife}
            onChange={markDirty(setWife)}
            placeholder="Search for wife…"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ff-marr-date">Marriage Date</label>
          <input
            id="ff-marr-date"
            className="form-input"
            value={marrDate}
            onChange={e => { setDirty(true); setMarrDate(e.target.value); }}
            placeholder="Jan 8, 1747"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ff-marr-place">Marriage Place</label>
          <input
            id="ff-marr-place"
            className="form-input"
            value={marrPlace}
            onChange={e => { setDirty(true); setMarrPlace(e.target.value); }}
            placeholder="Alzingen"
          />
        </div>

        {/* Children */}
        <div className="form-group full-width">
          <label className="form-label">Children</label>
          {children.length > 0 && (
            <div className="children-list">
              {children.map(c => (
                <div key={c.id} className="child-item">
                  <span>{c.name.replace(/\//g, '').trim()}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--sepia)', marginLeft: '0.4rem' }}>
                    {c.id}
                  </span>
                  <button
                    type="button"
                    className="child-remove-btn"
                    onClick={() => removeChild(c.id)}
                    title="Remove child"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <PersonSearch
            treeSlug={treeSlug}
            value={childToAdd}
            onChange={p => { addChild(p); }}
            placeholder="Search to add a child…"
          />
        </div>
      </div>

      {status === 'error' && (
        <p style={{ color: 'var(--rust)', marginTop: '0.75rem' }}>{error}</p>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : isNew ? 'Create family' : 'Save changes'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (!dirty || window.confirm('Discard unsaved changes?')) {
              router.push(`/trees/${treeSlug}/admin/families`);
            }
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
