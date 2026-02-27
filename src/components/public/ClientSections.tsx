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

export function PublicTreeExplorer({ treeSlug, role }: { treeSlug: string; role?: string }) {
  return <TreeExplorer treeSlug={treeSlug} role={role} />;
}

export function PublicDirectorySection({ treeSlug }: { treeSlug: string }) {
  return <DirectorySection treeSlug={treeSlug} />;
}
