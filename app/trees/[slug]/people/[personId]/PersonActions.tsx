"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PersonActions({
  personId,
  treeId,
  treeSlug,
}: {
  personId: string;
  treeId: string;
  treeSlug: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Permanently delete this person? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/trees/${treeId}/people/${personId}`, { method: "DELETE" });
      router.push(`/trees/${treeSlug}`);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
      <Link
        href={`/trees/${treeSlug}/people/${personId}/edit`}
        style={{
          padding: "0.4rem 0.875rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--cream-border)",
          background: "var(--surface-raised)",
          color: "var(--text-secondary)",
          fontSize: "0.875rem",
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{
          padding: "0.4rem 0.875rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid color-mix(in srgb, var(--color-error) 30%, transparent)",
          background: "transparent",
          color: "var(--color-error)",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: deleting ? "not-allowed" : "pointer",
          opacity: deleting ? 0.5 : 1,
        }}
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
