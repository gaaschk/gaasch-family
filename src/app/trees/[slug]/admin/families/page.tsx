'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Family, PaginatedResponse } from '@/types';

const PAGE_SIZE = 50;

function personName(name?: string | null) {
  if (!name) return '—';
  return name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
}

export default function TreeFamiliesPage() {
  const params = useParams();
  const treeSlug = params.slug as string;

  const [page, setPage] = useState(0);
  const [data, setData] = useState<Family[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(
    (pg: number) => {
      setLoading(true);
      const urlParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pg * PAGE_SIZE),
      });
      fetch(`/api/trees/${treeSlug}/families?${urlParams}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then((res: PaginatedResponse<Family>) => {
          setData(res.data);
          setTotal(res.total);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [treeSlug],
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  async function handleDelete(id: string) {
    setDeleting(true);
    setDeleteError('');
    const res = await fetch(`/api/trees/${treeSlug}/families/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    setConfirmDeleteId(null);
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? `Delete failed (${res.status})`);
      return;
    }
    load(page);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Families</h1>
        <Link
          href={`/trees/${treeSlug}/admin/families/new`}
          className="btn btn-primary"
        >
          + New family
        </Link>
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
                  <th>Husband</th>
                  <th>Wife</th>
                  <th>Marriage Date</th>
                  <th>Marriage Place</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(f => (
                  <tr key={f.id}>
                    <td className="col-id">{f.gedcomId ?? f.id}</td>
                    <td style={{ fontSize: '0.9rem' }}>
                      {personName(f.husband?.name)}
                    </td>
                    <td style={{ fontSize: '0.9rem' }}>
                      {personName(f.wife?.name)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {f.marrDate ?? '—'}
                    </td>
                    <td
                      style={{
                        fontSize: '0.85rem',
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.marrPlace ?? '—'}
                    </td>
                    <td>
                      {confirmDeleteId === f.id ? (
                        <span className="inline-confirm">
                          Sure?{' '}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(f.id)}
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
                            href={`/trees/${treeSlug}/admin/families/${encodeURIComponent(f.id)}/edit`}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </Link>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setConfirmDeleteId(f.id)}
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
