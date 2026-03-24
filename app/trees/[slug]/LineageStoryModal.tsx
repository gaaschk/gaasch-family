"use client";

import { useEffect, useRef, useState } from "react";

type PersonRef = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

type Props = {
  treeId: string;
  fromPerson: PersonRef;
  toPerson: PersonRef;
  onClose: () => void;
};

function personName(p: PersonRef) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unknown";
}

export default function LineageStoryModal({
  treeId,
  fromPerson,
  toPerson,
  onClose,
}: Props) {
  const [narrative, setNarrative] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) modalRef.current.focus();
  }, []);

  // Escape key closes modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-start on mount — intentionally empty deps, runs once
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once on mount
  useEffect(() => {
    if (!started) {
      setStarted(true);
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setNarrative("");
    setError(null);
    setIsStreaming(true);

    try {
      const res = await fetch(`/api/trees/${treeId}/lineage-story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPersonId: fromPerson.id,
          toPersonId: toPerson.id,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.code === "NO_PATH") {
          setError(
            `No lineage path found between ${personName(fromPerson)} and ${personName(toPerson)} (within 6 generations).`,
          );
          return;
        }
        if (json.code === "NO_API_KEY") {
          setError(
            "AI isn't configured for this tree. Ask the tree owner to add an Anthropic API key in Settings.",
          );
          return;
        }
        throw new Error(json.error ?? "Generation failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream");

      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setNarrative(accumulated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsStreaming(false);
    }
  }

  function exportAs(format: "txt" | "md" | "html") {
    const fromName = personName(fromPerson);
    const toName = personName(toPerson);
    const plainText = narrative
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    let content = "";
    let mimeType = "text/plain";
    const ext = format;

    if (format === "txt") {
      content = `${fromName} to ${toName} — Lineage Story\n\n${plainText}`;
    } else if (format === "md") {
      content = `# ${fromName} to ${toName} — Lineage Story\n\n${plainText}`;
      mimeType = "text/markdown";
    } else if (format === "html") {
      content = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${fromName} to ${toName} — Lineage Story</title>
<style>
  body { font-family: Georgia, serif; max-width: 680px; margin: 3rem auto; padding: 0 1.5rem; color: #2c1f0e; line-height: 1.8; font-size: 18px; }
  h1 { font-size: 1.5rem; margin-bottom: 2rem; }
  p { margin-bottom: 1.25rem; }
</style>
</head>
<body>
<h1>${fromName} to ${toName}</h1>
${narrative}
</body>
</html>`;
      mimeType = "text/html";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lineage-${fromName.replace(/\s+/g, "-")}-to-${toName.replace(/\s+/g, "-")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    window.print();
  }

  const fromName = personName(fromPerson);
  const toName = personName(toPerson);

  return (
    <>
      {/* Backdrop */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop captures outside clicks */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 60,
        }}
      />

      {/* Modal */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: dialog role with Escape handler covers keyboard */}
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-label={`Lineage story from ${fromName} to ${toName}`}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 61,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          pointerEvents: "none",
          outline: "none",
        }}
      >
        <div
          style={{
            background: "var(--parchment)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg, 10px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
            width: "100%",
            maxWidth: "48rem",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "auto",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1.25rem 1.5rem 1rem",
              borderBottom: "1px solid var(--border-light, var(--border))",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "1rem",
              flexShrink: 0,
            }}
          >
            <div>
              <h2
                className="font-display"
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 600,
                  color: "var(--brown-text)",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {fromName} → {toName}
              </h2>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--brown-muted)",
                  margin: "0.25rem 0 0",
                  fontFamily: "var(--font-ui, inherit)",
                }}
              >
                Lineage story
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexShrink: 0,
              }}
            >
              {narrative && !isStreaming && (
                <div style={{ position: "relative" }}>
                  <ExportMenu onExport={exportAs} onPdf={exportPdf} />
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.25rem",
                  color: "var(--brown-muted)",
                  padding: "4px",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className="lineage-story-content"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.5rem",
            }}
          >
            {isStreaming && !narrative && (
              <p
                style={{
                  color: "var(--brown-muted)",
                  fontStyle: "italic",
                  fontFamily: "var(--font-serif, Georgia, serif)",
                  fontSize: "1rem",
                }}
              >
                Generating your lineage story…
              </p>
            )}

            {error && (
              <div>
                <p
                  style={{
                    color: "var(--error, #b91c1c)",
                    fontSize: "0.9375rem",
                    fontFamily: "var(--font-ui, inherit)",
                    marginBottom: "1rem",
                  }}
                >
                  {error}
                </p>
                <button
                  type="button"
                  onClick={generate}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "var(--forest-bg)",
                    border: "1px solid var(--forest)",
                    borderRadius: "var(--radius-md, 6px)",
                    color: "var(--brown-text)",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "var(--font-ui, inherit)",
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            {narrative && (
              <div
                style={{
                  fontFamily: "var(--font-serif, Georgia, serif)",
                  fontSize: "1.125rem",
                  color: "var(--brown-text)",
                  lineHeight: 1.8,
                  maxWidth: "65ch",
                }}
                // biome-ignore lint/security/noDangerouslySetInnerHtml: narrative is AI-generated HTML from our own API, not user input
                dangerouslySetInnerHTML={{ __html: narrative }}
              />
            )}

            {isStreaming && narrative && (
              <span
                style={{
                  display: "inline-block",
                  width: "2px",
                  height: "1em",
                  background: "var(--brown-muted)",
                  marginLeft: "2px",
                  verticalAlign: "text-bottom",
                  animation: "blink 1s step-end infinite",
                }}
              />
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @media print {
          body > *:not(.lineage-story-print) { display: none !important; }
          .lineage-story-content { display: block !important; }
        }
      `}</style>
    </>
  );
}

function ExportMenu({
  onExport,
  onPdf,
}: {
  onExport: (fmt: "txt" | "md" | "html") => void;
  onPdf: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "0.375rem 0.75rem",
          background: "var(--parchment-3, #e8dcc8)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md, 6px)",
          color: "var(--brown-text)",
          fontSize: "0.8125rem",
          fontFamily: "var(--font-ui, inherit)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
        }}
      >
        ↓ Save
        <span style={{ fontSize: "0.625rem" }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "var(--parchment)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md, 6px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            minWidth: "120px",
            zIndex: 70,
          }}
        >
          {(
            [
              { label: "Text (.txt)", action: () => onExport("txt") },
              { label: "Markdown (.md)", action: () => onExport("md") },
              { label: "HTML (.html)", action: () => onExport("html") },
              { label: "PDF (print)", action: onPdf },
            ] as const
          ).map(({ label, action }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                action();
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "0.5rem 0.875rem",
                background: "none",
                border: "none",
                textAlign: "left",
                fontSize: "0.8125rem",
                fontFamily: "var(--font-ui, inherit)",
                color: "var(--brown-text)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
