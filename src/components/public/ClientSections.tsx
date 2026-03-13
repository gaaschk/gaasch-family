'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [view, setView] = useState<'explorer' | 'directory'>(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash === '#directory' ? 'directory' : 'explorer';
    }
    return 'explorer';
  });
  const [externalPersonId, setExternalPersonId] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => {
      setView(window.location.hash === '#directory' ? 'directory' : 'explorer');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const handleDirectorySelect = useCallback((id: string) => {
    setExternalPersonId(id);
    window.location.hash = '';
    setView('explorer');
  }, []);

  return (
    <div className="tree-page-shell">
      {view === 'explorer' ? (
        <TreeExplorer
          treeSlug={treeSlug}
          treeName={treeName}
          role={role}
          defaultPersonId={defaultPersonId}
          userId={userId}
          hasFsConnection={hasFsConnection}
          externalPersonId={externalPersonId ?? undefined}
        />
      ) : (
        <DirectorySection
          treeSlug={treeSlug}
          onSelectPerson={handleDirectorySelect}
        />
      )}
    </div>
  );
}
