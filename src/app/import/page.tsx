'use client';

import Link from 'next/link';

export default function ImportPage() {
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

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>
            Import your tree
          </h1>
          <p style={{ fontSize: 15, color: '#7a6a5a', textAlign: 'center', marginBottom: 36, lineHeight: 1.5 }}>
            Heirloom supports GEDCOM import for existing trees.
          </p>

          {/* GEDCOM import — honest status */}
          <div style={{
            background: 'white',
            border: '1px solid #e8e0d8',
            borderRadius: 12,
            padding: '32px 28px',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>📂</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>GEDCOM file import</h3>
                <p style={{ fontSize: 14, color: '#7a6a5a', lineHeight: 1.5, margin: '0 0 12px' }}>
                  If you have a .ged file from Ancestry, FamilySearch, or another tool,
                  you can import it into an existing tree via the tree admin panel.
                </p>
                <p style={{ fontSize: 13, color: '#9a8a7a', lineHeight: 1.5, margin: '0 0 16px' }}>
                  To import: create a tree first, then go to <strong>Admin &rarr; Import</strong> for that tree.
                </p>
                <Link href="/trees/new" style={{
                  display: 'inline-block',
                  padding: '9px 20px',
                  borderRadius: 7,
                  background: '#8b5e3c',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                }}>
                  Create a tree
                </Link>
              </div>
            </div>
          </div>

          {/* Future integrations */}
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#9a8a7a',
            textTransform: 'uppercase',
            letterSpacing: 0.7,
            marginBottom: 14,
          }}>
            Direct service connections
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {([
              { icon: '🧬', name: 'Ancestry.com' },
              { icon: '🌿', name: 'FamilySearch' },
              { icon: '🧪', name: 'MyHeritage' },
            ] as const).map(({ icon, name }) => (
              <div key={name} style={{
                background: 'white',
                borderRadius: 10,
                border: '1px solid #e8e0d8',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                opacity: 0.6,
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#2c1810', flex: 1 }}>{name}</span>
                <span style={{ fontSize: 12, color: '#9a8a7a', flexShrink: 0 }}>Not yet available</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/home" style={{ fontSize: 14, fontWeight: 600, color: '#7a6a5a', textDecoration: 'none' }}>
              &larr; Back
            </Link>
            <Link href="/trees/new" style={{
              padding: '9px 20px',
              borderRadius: 7,
              fontSize: 14,
              fontWeight: 500,
              background: 'white',
              border: '1px solid #e8e0d8',
              color: '#2c1810',
              textDecoration: 'none',
            }}>
              Start from scratch instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
