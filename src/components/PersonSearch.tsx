'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Person } from '@/types';

interface PersonSearchProps {
  value: Person | null;
  onChange: (person: Person | null) => void;
  placeholder?: string;
  label?: string;
}

function displayName(p: Person) {
  return p.name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
}

function personMeta(p: Person) {
  const parts: string[] = [];
  if (p.birthDate)  parts.push(`b. ${p.birthDate}`);
  if (p.birthPlace) parts.push(p.birthPlace);
  return parts.join(' · ');
}

export default function PersonSearch({ value, onChange, placeholder = 'Search by name…', label }: PersonSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    fetch(`/api/people?q=${encodeURIComponent(q)}&limit=10`)
      .then(r => r.json())
      .then(data => {
        setResults(data.data ?? []);
        setOpen(true);
        setFocusedIdx(-1);
      })
      .catch(() => setResults([]));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current  && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function selectPerson(p: Person) {
    onChange(p);
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIdx >= 0 && results[focusedIdx]) selectPerson(results[focusedIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  if (value) {
    return (
      <div className="person-search-wrap">
        {label && <label className="form-label">{label}</label>}
        <div className="person-search-selected">
          <span className="person-search-name">{displayName(value)}</span>
          <span className="person-search-meta">{value.id}</span>
          <button
            type="button"
            className="person-search-clear"
            onClick={() => onChange(null)}
            title="Clear"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="person-search-wrap">
      {label && <label className="form-label">{label}</label>}
      <input
        ref={inputRef}
        type="text"
        className="form-input"
        style={{ width: '100%' }}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => query && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div ref={dropdownRef} className="person-search-dropdown">
          {results.map((p, i) => (
            <div
              key={p.id}
              className={`person-search-item${i === focusedIdx ? ' focused' : ''}`}
              onMouseDown={() => selectPerson(p)}
            >
              <span className="person-search-name">{displayName(p)}</span>
              {personMeta(p) && (
                <span className="person-search-meta">{personMeta(p)}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.trim() && (
        <div ref={dropdownRef} className="person-search-dropdown">
          <div className="person-search-item" style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>
            No results for &ldquo;{query}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}
