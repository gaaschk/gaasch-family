'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Person, PaginatedResponse } from '@/types';

const PAGE_SIZE = 50;

function displayName(p: Person) {
  return p.name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
}

export default function TreePeoplePage() {
  const params = useParams();
  const treeSlug = params.slug as string;

  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(
    (query: string, pg: number) => {
      setLoading(true);
      const urlParams = new URLSearchParams({
        q: query,
        limit: String(PAGE_SIZE),
        offset: String(pg * PAGE_SIZE),
      });
      fetch(`/api/trees/${treeSlug}/people?${urlParams}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then((res: PaginatedResponse<Person>) => {
          setData(res.data);
          setTotal(res.total);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [treeSlug],
  );

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      load(q, 0);
    }, 250);
    return () => clearTimeout(t);
  }, [q, load]);

  // Page changes
  useEffect(() => {
    load(q, page);
  }, [page, q, load]);

  async function handleDelete(id: string) {
    setDeleting(true);
    setDeleteError('');
    const res = await fetch(`/api/trees/${treeSlug}/people/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    setConfirmDeleteId(null);
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? `Delete failed (${res.status})`);
      return;
    }
    load(q, page);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">People</h1>
        <Link
          href={`/trees/${treeSlug}/admin/people/new`}
          className="btn btn-primary"
        >
          + New person
        </Link>
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

      {deleteError && (
        <p style={{ color: 'var(--rust)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{deleteError}</p>
      )}

      {loading ? (
        <p style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>Loading…</p>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>GEDCOM ID</th>
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
                    <td className="col-id">{p.gedcomId ?? p.id}</td>
                    <td className="col-name">{displayName(p)}</td>
                    <td style={{ color: 'var(--sepia)', fontSize: '0.82rem' }}>
                      {p.sex ?? '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {p.birthDate ?? '—'}
                    </td>
                    <td
                      style={{
                        fontSize: '0.85rem',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.birthPlace ?? '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {p.deathDate ?? '—'}
                    </td>
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
                            href={`/trees/${treeSlug}/admin/people/${encodeURIComponent(p.id)}/edit`}
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
              &larr; Prev
            </button>
            <span>
              Page {page + 1} of {totalPages || 1} &nbsp;&middot;&nbsp;{' '}
              {total.toLocaleString()} records
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Next &rarr;
            </button>
          </div>
        </>
      )}
    </div>
  );
}
