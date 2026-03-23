"use client";

import { useRouter } from "next/navigation";

export default function GenerationControls({
  ancestorGens,
  descendantGens,
  treeSlug,
  view,
  root,
}: {
  ancestorGens: number;
  descendantGens: number;
  treeSlug: string;
  view: string;
  root?: string;
}) {
  const router = useRouter();

  function navigate(newAgens: number, newDgens: number) {
    const params = new URLSearchParams();
    params.set("view", view);
    if (root) params.set("root", root);
    params.set("agens", String(newAgens));
    params.set("dgens", String(newDgens));
    router.replace(`/trees/${treeSlug}?${params.toString()}`);
  }

  return (
    <div
      style={{
        padding: "0.75rem 0",
        display: "flex",
        alignItems: "center",
        gap: "2rem",
      }}
    >
      {/* Ancestors stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span
          className="font-ui"
          style={{ fontSize: "12px", color: "var(--brown-muted)" }}
        >
          Ancestors
        </span>
        <button
          type="button"
          onClick={() =>
            navigate(Math.max(1, ancestorGens - 1), descendantGens)
          }
          disabled={ancestorGens <= 1}
          aria-label="Decrease ancestor generations"
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--brown-text)",
            cursor: ancestorGens <= 1 ? "default" : "pointer",
            opacity: ancestorGens <= 1 ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            margin: "-10px",
            fontSize: "14px",
            lineHeight: 1,
          }}
        >
          −
        </button>
        <span
          className="font-mono"
          style={{
            fontSize: "14px",
            color: "var(--brown-text)",
            minWidth: "1.25rem",
            textAlign: "center",
          }}
        >
          {ancestorGens}
        </span>
        <button
          type="button"
          onClick={() =>
            navigate(Math.min(6, ancestorGens + 1), descendantGens)
          }
          disabled={ancestorGens >= 6}
          aria-label="Increase ancestor generations"
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--brown-text)",
            cursor: ancestorGens >= 6 ? "default" : "pointer",
            opacity: ancestorGens >= 6 ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            margin: "-10px",
            fontSize: "14px",
            lineHeight: 1,
          }}
        >
          +
        </button>
      </div>

      {/* Descendants stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span
          className="font-ui"
          style={{ fontSize: "12px", color: "var(--brown-muted)" }}
        >
          Descendants
        </span>
        <button
          type="button"
          onClick={() =>
            navigate(ancestorGens, Math.max(0, descendantGens - 1))
          }
          disabled={descendantGens <= 0}
          aria-label="Decrease descendant generations"
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--brown-text)",
            cursor: descendantGens <= 0 ? "default" : "pointer",
            opacity: descendantGens <= 0 ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            margin: "-10px",
            fontSize: "14px",
            lineHeight: 1,
          }}
        >
          −
        </button>
        <span
          className="font-mono"
          style={{
            fontSize: "14px",
            color: "var(--brown-text)",
            minWidth: "1.25rem",
            textAlign: "center",
          }}
        >
          {descendantGens}
        </span>
        <button
          type="button"
          onClick={() =>
            navigate(ancestorGens, Math.min(4, descendantGens + 1))
          }
          disabled={descendantGens >= 4}
          aria-label="Increase descendant generations"
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--brown-text)",
            cursor: descendantGens >= 4 ? "default" : "pointer",
            opacity: descendantGens >= 4 ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            margin: "-10px",
            fontSize: "14px",
            lineHeight: 1,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
