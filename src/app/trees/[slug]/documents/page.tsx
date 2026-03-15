"use client";
import Link from 'next/link';
import React from 'react';

export default function DocumentsPage({ treeSlug }: { treeSlug: string }) {
  return (
    <div>
      <h1>Documents for tree</h1>
      <p>Placeholder MVP: Upload, list, download documents tied to a tree.</p>
      <Link href={`/trees/${treeSlug}`}>Back to Tree</Link>
    </div>
  );
}
