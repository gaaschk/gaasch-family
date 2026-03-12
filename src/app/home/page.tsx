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
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lastViewed');
      if (raw) setLastViewed(JSON.parse(raw) as LastViewed);
    } catch { /* ignore */ }

    fetch('/api/trees')
      .then(r => {
        if (r.status === 404) return { owned: [], member: [] };
        if (!r.ok && r.status >= 500) return Promise.reject(r);
        if (!r.ok) return { owned: [], member: [] };
        return r.json();
      })
      .then((data: { owned: Tree[]; member: Tree[] }) => {
        const owned = data.owned ?? [];
        const member = data.member ?? [];
        const ownedIds = new Set(owned.map(t => t.id));
        setOwnedTrees(owned);
        setMemberTrees(member.filter(t => !ownedIds.has(t.id)));
      })
      .catch(() => setFetchError(true))
      .finally(() => setReady(true));
  }, []);

  const allTrees = [...ownedTrees, ...memberTrees];
  const hasTrees = allTrees.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f4f0', display: 'flex', flexDirection: 'column' }}>
      {/* Onboarding nav */}
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e8e0d8',
        padding: '0 32px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#2c1810', letterSpacing: -0.5 }}>
          heir<span style={{ color: '#8b5e3c' }}>loom</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard" style={{ fontSize: 14, color: '#7a6a5a', textDecoration: 'none' }}>
            All Trees
          </Link>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#8b5e3c',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
          }}>
            U
          </div>
        </div>
      </nav>

      {!ready ? null : fetchError || !hasTrees ? (
        /* ── Empty state / onboarding (inspired by 03-welcome.html) ── */
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ maxWidth: 640, width: '100%' }}>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b5e3c' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e8e0d8' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e8e0d8' }} />
            </div>

            <h1 style={{ fontSize: 30, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
              Welcome to Heirloom
            </h1>
            <p style={{ fontSize: 15, color: '#7a6a5a', textAlign: 'center', marginBottom: 36, lineHeight: 1.5 }}>
              Tell us what brought you here so we can tailor your experience.
            </p>

            {/* Goal cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              marginBottom: 32,
            }}>
              {([
                { icon: '🇪🇺', title: 'European citizenship', desc: 'I want to find out if I qualify for citizenship by descent.' },
                { icon: '🌳', title: 'Build my family tree', desc: 'I want to research and organize my ancestry.' },
                { icon: '📖', title: 'Tell my family story', desc: 'I want to create a narrative record of my heritage.' },
                { icon: '📄', title: 'Track an application', desc: "I'm already applying and need to organize documents." },
              ] as const).map(({ icon, title, desc }, i) => (
                <div key={title} style={{
                  background: i === 0 ? '#fdf6ef' : 'white',
                  borderRadius: 12,
                  border: i === 0 ? '2px solid #8b5e3c' : '2px solid #e8e0d8',
                  padding: '24px 20px',
                  textAlign: 'center',
                  ...(i === 0 ? { boxShadow: '0 0 0 3px rgba(139,94,60,0.15)' } : {}),
                }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#7a6a5a', lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>

            {/* Citizenship highlight */}
            <div style={{
              background: 'linear-gradient(135deg, #fdf6ef, #f0ebe3)',
              border: '1px solid #e8d8c8',
              borderRadius: 12,
              padding: '20px 24px',
              marginBottom: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{ fontSize: 28 }}>🏰</div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 14, display: 'block', marginBottom: 2 }}>
                  Built for citizenship research
                </strong>
                <p style={{ fontSize: 13, color: '#7a6a5a', lineHeight: 1.4, margin: 0 }}>
                  Heirloom helps you build the documented lineage you need to research European citizenship by descent.
                </p>
              </div>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
              How would you like to start?
            </h2>

            {/* Start options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
              <Link href="/trees/new" style={{
                background: 'white',
                borderRadius: 12,
                border: '2px solid #e8e0d8',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color 0.15s',
              }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>✨</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>Start from scratch</h3>
                  <p style={{ fontSize: 13, color: '#7a6a5a', lineHeight: 1.4, margin: 0 }}>
                    Create a new tree and begin adding your family manually.
                  </p>
                </div>
                <span style={{ fontSize: 18, color: '#c8b8a8' }}>&rarr;</span>
              </Link>

              <Link href="/import" style={{
                background: 'white',
                borderRadius: 12,
                border: '2px solid #e8e0d8',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color 0.15s',
              }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>📥</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>Import an existing tree</h3>
                  <p style={{ fontSize: 13, color: '#7a6a5a', lineHeight: 1.4, margin: 0 }}>
                    Bring in a GEDCOM file from another genealogy tool.
                  </p>
                </div>
                <span style={{ fontSize: 18, color: '#c8b8a8' }}>&rarr;</span>
              </Link>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link href="/dashboard" style={{ color: '#7a6a5a', fontSize: 14, textDecoration: 'none' }}>
                Skip for now
              </Link>
              <Link href="/trees/new" style={{
                padding: '12px 28px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                background: '#8b5e3c',
                color: 'white',
                textDecoration: 'none',
              }}>
                Continue &rarr;
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ── Has trees: show tree list ── */
        <div style={{ maxWidth: 840, margin: '0 auto', padding: '48px 32px', width: '100%' }}>
          {/* Continue where you left off */}
          {lastViewed && allTrees.some(t => t.slug === lastViewed.treeSlug) && (
            <section style={{ marginBottom: 40 }}>
              <p style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: '#9a8a7a',
                marginBottom: 12,
              }}>
                Continue where you left off
              </p>
              <Link
                href={`/trees/${lastViewed.treeSlug}`}
                style={{ textDecoration: 'none', display: 'block', maxWidth: 480 }}
              >
                <div style={{
                  border: '1px solid #e8e0d8',
                  borderRadius: 10,
                  padding: '20px 24px',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  transition: 'box-shadow 0.15s',
                }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: '#2c1810', margin: '0 0 4px' }}>
                      {lastViewed.personName}
                    </p>
                    <p style={{ fontSize: 13, color: '#9a8a7a', margin: 0 }}>
                      {lastViewed.treeName}
                    </p>
                  </div>
                  <span style={{ color: '#c4935a', fontSize: 18, flexShrink: 0 }}>&rsaquo;</span>
                </div>
              </Link>
            </section>
          )}

          {/* Trees */}
          <section>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#9a8a7a',
              marginBottom: 12,
            }}>
              {allTrees.length === 1 ? 'Your Tree' : 'Your Trees'}
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14,
              maxWidth: 720,
            }}>
              {allTrees.map(tree => (
                <Link
                  key={tree.id}
                  href={`/trees/${tree.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    border: '1px solid #e8e0d8',
                    borderRadius: 10,
                    padding: '16px 18px',
                    background: 'white',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    transition: 'box-shadow 0.15s',
                  }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#2c1810', margin: 0 }}>
                      {tree.name}
                    </p>
                    {tree.description && (
                      <p style={{ fontSize: 13, color: '#7a6a5a', margin: 0, lineHeight: 1.5 }}>
                        {tree.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
              <Link href="/trees/new" style={{ textDecoration: 'none' }}>
                <div style={{
                  border: '2px dashed #e8e0d8',
                  borderRadius: 10,
                  padding: '16px 18px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9a8a7a',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'border-color 0.15s',
                }}>
                  + New tree
                </div>
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
