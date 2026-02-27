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

export function PublicTreeExplorer({ treeSlug, treeName, role, defaultPersonId, userId }: { treeSlug: string; treeName?: string; role?: string; defaultPersonId?: string; userId?: string }) {
  return <TreeExplorer treeSlug={treeSlug} treeName={treeName} role={role} defaultPersonId={defaultPersonId} userId={userId} />;
}

export function PublicDirectorySection({ treeSlug }: { treeSlug: string }) {
  return <DirectorySection treeSlug={treeSlug} />;
}
