'use client';

import dynamic from 'next/dynamic';

const TreeExplorer = dynamic(
  () => import('./TreeExplorer'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '4rem 2rem', color: 'var(--sepia)', fontStyle: 'italic' }}>
        Loading tree explorer…
      </div>
    ),
  }
);

const MapsSection = dynamic(
  () => import('./MapsSection'),
  {
    ssr: false,
    loading: () => (
      <div className="maps-section" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--sepia)', fontStyle: 'italic' }}>
        Loading maps…
      </div>
    ),
  }
);

const DirectorySection = dynamic(
  () => import('./DirectorySection'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '4rem 2rem', color: 'var(--sepia)', fontStyle: 'italic' }}>
        Loading directory…
      </div>
    ),
  }
);

export function PublicTreeExplorer() {
  return <TreeExplorer />;
}

export function PublicMapsSection() {
  return <MapsSection />;
}

export function PublicDirectorySection() {
  return <DirectorySection />;
}
