'use client';

import { useState } from 'react';
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

export function TreePageComponents({
  treeSlug,
  treeName,
  role,
  defaultPersonId,
  userId,
  hasFsConnection,
}: {
  treeSlug: string;
  treeName?: string;
  role?: string;
  defaultPersonId?: string;
  userId?: string;
  hasFsConnection?: boolean;
}) {
  const [externalPersonId, setExternalPersonId] = useState<string | null>(null);

  return (
    <>
      <TreeExplorer
        treeSlug={treeSlug}
        treeName={treeName}
        role={role}
        defaultPersonId={defaultPersonId}
        userId={userId}
        hasFsConnection={hasFsConnection}
        externalPersonId={externalPersonId ?? undefined}
      />
      <DirectorySection
        treeSlug={treeSlug}
        onSelectPerson={id => {
          setExternalPersonId(id);
          document.getElementById('chapters')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </>
  );
}
