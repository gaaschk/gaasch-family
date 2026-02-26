'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Person, PaginatedResponse } from '@/types';

// The nine direct-line paternal ancestors
const DIRECT_LINE = new Set([
  '@I501485@', // Jean Gaasch (c. 1698)
  '@I501477@', // Nicolas Gaasch (c. 1717)
  '@I501475@', // Simon Gaasch (1760)
  '@I500035@', // Jacobus Gaasch (1788)
  '@I500019@', // Joannes Gaasch (1821)
  '@I500011@', // Peter Gaasch (1849)
  '@I500008@', // Glenn Melvin Gaasch (1888)
  '@I500007@', // Melvin Lloyd Gaasch (1914)
  '@I500003@', // Phil Eugene Gaasch (1944)
]);

const PAGE_SIZE = 50;

function displayName(p: Person) {
  return p.name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
}

export default function PeoplePage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback((query: string, pg: number) => {
    setLoading(true);
    const params = new URLSearchParams({
      q:      query,
      limit:  String(PAGE_SIZE),
      offset: String(pg * PAGE_SIZE),
    });
    fetch(`/api/people?${params}`)
      .then(r => r.json())
      .then((res: PaginatedResponse<Person>) => {
        setData(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); load(q, 0); }, 250);
    return () => clearTimeout(t);
  }, [q, load]);

  // Page changes
  useEffect(() => { load(q, page); }, [page, q, load]);

  async function handleDelete(id: string) {
    setDeleting(true);
    await fetch(`/api/people/${encodeURIComponent(id)}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    setDeleting(false);
    load(q, page);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">People</h1>
        <Link href="/admin/people/new" className="btn btn-primary">+ New person</Link>
      </div>

      <div className="search-bar">
        <input
          type="search"
          className="search-input"
          placeholder="Search by name…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>Loading…</p>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Sex</th>
                  <th>Birth</th>
                  <th>Birth Place</th>
                  <th>Death</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(p => (
                  <tr key={p.id}>
                    <td className="col-id">{p.id}</td>
                    <td className="col-name">
                      {DIRECT_LINE.has(p.id) && (
                        <span className="direct-line-star" title="Direct paternal line ancestor">★</span>
                      )}
                      {displayName(p)}
                    </td>
                    <td style={{ color: 'var(--sepia)', fontSize: '0.82rem' }}>{p.sex ?? '—'}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{p.birthDate ?? '—'}</td>
                    <td style={{ fontSize: '0.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.birthPlace ?? '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{p.deathDate ?? '—'}</td>
                    <td>
                      {confirmDeleteId === p.id ? (
                        <span className="inline-confirm">
                          Sure?{' '}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(p.id)}
                            disabled={deleting}
                          >
                            Yes
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <span style={{ display: 'flex', gap: '0.4rem' }}>
                          <Link
                            href={`/admin/people/${encodeURIComponent(p.id)}/edit`}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </Link>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setConfirmDeleteId(p.id)}
                          >
                            Del
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              ← Prev
            </button>
            <span>
              Page {page + 1} of {totalPages || 1} &nbsp;·&nbsp; {total.toLocaleString()} records
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
