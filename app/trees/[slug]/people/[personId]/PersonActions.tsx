"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleDelete() {
    if (!confirm("Permanently delete this person? This cannot be undone."))
      return;
    setDeleting(true);
    try {
      await fetch(`/api/trees/${treeId}/people/${personId}`, {
        method: "DELETE",
      });
      router.push(`/trees/${treeSlug}`);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleGenerateNarrative() {
    setGenError(null);
    setGenerating(true);
    abortRef.current = new AbortController();
    try {
      const res = await fetch(
        `/api/trees/${treeId}/people/${personId}/generate-narrative`,
        { method: "POST", signal: abortRef.current.signal },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGenError(data.error ?? "Generation failed.");
        return;
      }
      // Consume the stream (narrative is saved server-side when complete)
      const reader = res.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setGenError(
          "Generation failed. Check that an API key is configured in tree settings.",
        );
      }
    } finally {
      setGenerating(false);
    }
  }

  const btnBase: React.CSSProperties = {
    padding: "0.4rem 0.875rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={handleGenerateNarrative}
          disabled={generating}
          title="Generate a biographical narrative using AI"
          style={{
            ...btnBase,
            background: generating ? "var(--amber-dark)" : "var(--amber)",
            color: "#fff",
            cursor: generating ? "not-allowed" : "pointer",
          }}
        >
          {generating ? "Generating…" : "Generate bio"}
        </button>
        <Link
          href={`/trees/${treeSlug}/people/${personId}/edit`}
          style={{
            ...btnBase,
            border: "1px solid var(--cream-border)",
            background: "var(--surface-raised)",
            color: "var(--text-secondary)",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          style={{
            ...btnBase,
            border:
              "1px solid color-mix(in srgb, var(--color-error) 30%, transparent)",
            background: "transparent",
            color: "var(--color-error)",
            cursor: deleting ? "not-allowed" : "pointer",
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
      {genError && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-error)",
            maxWidth: "20rem",
            textAlign: "right",
          }}
        >
          {genError}
        </p>
      )}
    </div>
  );
}
