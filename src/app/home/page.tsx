'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type LastViewed = {
  treeSlug: string;
  treeName: string;
  personId: string;
  personName: string;
};

type Tree = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  memberCount: number;
};

export default function HomePage() {
  const [lastViewed, setLastViewed] = useState<LastViewed | null>(null);
  const [ownedTrees, setOwnedTrees] = useState<Tree[]>([]);
  const [memberTrees, setMemberTrees] = useState<Tree[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Read last-viewed from localStorage (client only)
    try {
      const raw = localStorage.getItem('lastViewed');
      if (raw) setLastViewed(JSON.parse(raw) as LastViewed);
    } catch { /* ignore */ }

    // Fetch the user's trees
    fetch('/api/trees')
      .then(r => r.json())
      .then((data: { owned: Tree[]; member: Tree[] }) => {
        const ownedIds = new Set((data.owned ?? []).map(t => t.id));
        setOwnedTrees(data.owned ?? []);
        setMemberTrees((data.member ?? []).filter(t => !ownedIds.has(t.id)));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const allTrees = [...ownedTrees, ...memberTrees];
  const hasTrees = allTrees.length > 0;

  return (
    <>
      <nav className="pub-nav">
        <span className="pub-nav-title">Home</span>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/dashboard" className="pub-nav-admin">All Trees</Link>
        </div>
      </nav>

      <div className="pub-page">
        {!ready ? null : !hasTrees ? (
          /* ── Empty state ── */
          <section className="hero-section" style={{ paddingTop: '5rem' }}>
            <div className="hero-ornament">✦ ✦ ✦</div>
            <h1 style={{ fontSize: '1.6rem' }}>Welcome</h1>
            <div className="hero-rule" />
            <p className="hero-body">
              You don&rsquo;t belong to any family trees yet.
            </p>
            <p className="hero-body" style={{ marginTop: '0.5rem', opacity: 0.7, fontSize: '0.92em' }}>
              Create your own tree to get started, or ask a tree owner to invite you.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.5rem', flexWrap: 'wrap' }}>
              <Link href="/trees/new" className="hero-cta">Create a tree</Link>
            </div>
          </section>
        ) : (
          <div className="section-wrap" style={{ paddingTop: '3rem' }}>

            {/* ── Continue where you left off ── */}
            {lastViewed && allTrees.some(t => t.slug === lastViewed.treeSlug) && (
              <section style={{ marginBottom: '3rem' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-sc)',
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                    color: 'var(--sepia)',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '1rem',
                  }}
                >
                  Continue where you left off
                </span>
                <Link
                  href={`/trees/${lastViewed.treeSlug}`}
                  style={{ textDecoration: 'none', display: 'block', maxWidth: 480 }}
                >
                  <div
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 10,
                      padding: '1.4rem 1.6rem',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
                  >
                    <div>
                      <p
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.15rem',
                          color: 'var(--ink)',
                          margin: 0,
                          marginBottom: '0.25rem',
                        }}
                      >
                        {lastViewed.personName}
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--font-sc)',
                          fontSize: '0.72rem',
                          color: 'var(--sepia)',
                          margin: 0,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {lastViewed.treeName}
                      </p>
                    </div>
                    <span
                      style={{
                        color: 'var(--gold)',
                        fontSize: '1.1rem',
                        flexShrink: 0,
                      }}
                    >
                      ›
                    </span>
                  </div>
                </Link>
              </section>
            )}

            {/* ── Trees ── */}
            <section>
              <span
                style={{
                  fontFamily: 'var(--font-sc)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  color: 'var(--sepia)',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '1rem',
                }}
              >
                {allTrees.length === 1 ? 'Your Tree' : 'Your Trees'}
              </span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '0.875rem',
                  maxWidth: 720,
                }}
              >
                {allTrees.map(tree => (
                  <Link
                    key={tree.id}
                    href={`/trees/${tree.slug}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        border: '1px solid var(--border-light)',
                        borderRadius: 8,
                        padding: '1rem 1.1rem',
                        background: '#fff',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        transition: 'box-shadow 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
                    >
                      <p
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1rem',
                          color: 'var(--ink)',
                          margin: 0,
                        }}
                      >
                        {tree.name}
                      </p>
                      {tree.description && (
                        <p
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--sepia)',
                            margin: 0,
                            lineHeight: 1.5,
                          }}
                        >
                          {tree.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
                <Link
                  href="/trees/new"
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      border: '1px dashed var(--border)',
                      borderRadius: 8,
                      padding: '1rem 1.1rem',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--sepia)',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-sc)',
                      letterSpacing: '0.04em',
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--gold)';
                      e.currentTarget.style.color = 'var(--ink)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.color = '';
                    }}
                  >
                    + New tree
                  </div>
                </Link>
              </div>
            </section>
          </div>
        )}

        <footer className="pub-footer" style={{ marginTop: '5rem' }}>
          <span className="pub-footer-ornament">✦ ✦ ✦</span>
          Family History
        </footer>
      </div>
    </>
  );
}
