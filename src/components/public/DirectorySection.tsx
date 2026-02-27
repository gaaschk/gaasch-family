'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Person, PaginatedResponse } from '@/types';

const PAGE_SIZE = 50;

function cleanName(name: string) {
  return name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
}

function formatLifespan(p: Person) {
  const b = p.birthDate?.replace(/^ABT |^BEF |^AFT |^BET .* AND /i, '') ?? '';
  const d = p.deathDate?.replace(/^ABT |^BEF |^AFT |^BET .* AND /i, '') ?? '';
  if (b && d) return `${b} – ${d}`;
  if (b) return `b. ${b}`;
  if (d) return `d. ${d}`;
  return '';
}

interface DirectorySectionProps {
  treeSlug: string;
  onSelectPerson?: (id: string) => void;
}

export default function DirectorySection({ treeSlug, onSelectPerson }: DirectorySectionProps) {
  const [q, setQ]           = useState('');
  const [surname, setSurname] = useState('');
  const [page, setPage]     = useState(0);
  const [data, setData]     = useState<Person[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [gedcomLoading, setGedcomLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((query: string, surnameFilter: string, pg: number) => {
    setLoading(true);
    const params = new URLSearchParams({
      q:       query,
      surname: surnameFilter,
      limit:   String(PAGE_SIZE),
      offset:  String(pg * PAGE_SIZE),
    });
    fetch(`/api/trees/${treeSlug}/people?${params}`)
      .then(r => r.json())
      .then((res: PaginatedResponse<Person>) => {
        setData(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [treeSlug]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      load(q, surname, 0);
    }, 250);
  }, [q, surname, load]);

  useEffect(() => {
    load(q, surname, page);
  }, [page]);  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGedcomDownload() {
    setGedcomLoading(true);
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
      setGedcomLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = page * PAGE_SIZE;

  return (
    <section id="directory" className="directory-section">
      <div className="section-wrap" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
        <div className="chapter-header fade-in">
          <span className="chapter-num">Full Record</span>
          <h2>All People</h2>
          <p className="chapter-meta">Every person in the family tree, searchable and sortable</p>
        </div>

        <div className="dir-export-row">
          <button
            className="dir-export-btn"
            onClick={handleGedcomDownload}
            disabled={gedcomLoading}
          >
            {gedcomLoading ? 'Generating…' : 'Download GEDCOM'}
          </button>
          <span className="dir-export-note">
            All records in standard GEDCOM 5.5.1 format, compatible with any genealogy application
          </span>
        </div>

        <div className="directory-controls">
          <label className="sr-only" htmlFor="dir-search">Search by name, place, or date</label>
          <input
            id="dir-search"
            type="text"
            placeholder="Search by name, place, or date…"
            value={q}
            onChange={e => setQ(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="directory-stats">
          {loading ? 'Loading…' : (
            <>
              Page {page + 1} of {totalPages || 1} &nbsp;·&nbsp;
              Showing {Math.min(start + 1, total)}–{Math.min(start + PAGE_SIZE, total)} of {total.toLocaleString()} people
            </>
          )}
        </div>

        {!loading && data.length === 0 ? (
          <div className="dir-empty">No people match these filters — try a different search.</div>
        ) : (
          <div className="directory-list">
            {data.map(p => {
              const lifespan = formatLifespan(p);
              return (
                <div
                  key={p.id}
                  className="dir-row"
                  onClick={() => onSelectPerson?.(p.id)}
                  role={onSelectPerson ? 'button' : undefined}
                  tabIndex={onSelectPerson ? 0 : undefined}
                >
                  <div className="dir-name">
                    {cleanName(p.name)}
                  </div>
                  <div className="dir-meta">
                    {lifespan     && <span className="dir-life">{lifespan}</span>}
                    {p.birthPlace && <span className="dir-place">{p.birthPlace}</span>}
                    {p.occupation && <span className="dir-occ">{p.occupation}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="directory-pagination">
            {page > 0 && (
              <button className="dir-page-btn" onClick={() => setPage(p => p - 1)}>← Prev</button>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
              return (
                <button
                  key={pg}
                  className={`dir-page-btn${pg === page ? ' active' : ''}`}
                  onClick={() => setPage(pg)}
                >
                  {pg + 1}
                </button>
              );
            })}
            {page < totalPages - 1 && (
              <button className="dir-page-btn" onClick={() => setPage(p => p + 1)}>Next →</button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
