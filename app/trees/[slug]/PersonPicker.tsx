"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PersonResult = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

export default function PersonPicker({
  treeId,
  treeSlug,
  label = "Starting from:",
}: {
  treeId: string;
  treeSlug: string;
  label?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? "list";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function search(q: string) {
    setLoading(true);
    setSearchError(false);
    try {
      const url = `/api/trees/${treeId}/people?q=${encodeURIComponent(q)}&page=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setResults((data.people as PersonResult[]).slice(0, 8));
        setOpen(true);
      } else {
        setSearchError(true);
      }
    } catch {
      setSearchError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setOpen(false);
      setSearchError(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  }

  function handleSelect(personId: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", currentView);
    params.set("root", personId);
    router.replace(`/trees/${treeSlug}?${params.toString()}`);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function displayName(p: PersonResult): string {
    const parts = [p.firstName, p.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "(unnamed)";
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-block",
        minWidth: "240px",
      }}
    >
      <label
        htmlFor="person-picker-input"
        style={{
          display: "block",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--brown-muted)",
          marginBottom: "0.375rem",
          fontFamily: "var(--font-ui, inherit)",
        }}
      >
        {label}
      </label>
      <input
        id="person-picker-input"
        type="search"
        placeholder="Search for a person…"
        value={query}
        onChange={handleInput}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        style={{
          width: "100%",
          padding: "0.5rem 0.875rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "var(--parchment-2)",
          color: "var(--brown-text)",
          fontSize: "0.875rem",
          outline: "none",
          boxSizing: "border-box",
        }}
        onFocusCapture={(e) => {
          (e.target as HTMLInputElement).style.borderColor = "var(--forest)";
        }}
        onBlurCapture={(e) => {
          (e.target as HTMLInputElement).style.borderColor = "var(--border)";
        }}
      />

      {loading && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--brown-muted)",
            marginTop: "0.25rem",
          }}
        >
          Searching…
        </p>
      )}

      {searchError && !loading && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--error, #c0392b)",
            marginTop: "0.25rem",
          }}
        >
          Search unavailable
        </p>
      )}

      {open &&
        (results.length > 0 || (!loading && !searchError && query.trim())) && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 50,
              background: "var(--parchment-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 4px 16px rgba(44,26,14,0.12)",
              overflow: "hidden",
            }}
          >
            <ul style={{ listStyle: "none", margin: 0, padding: "0.375rem 0" }}>
              {results.length === 0 && (
                <li
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.875rem",
                    color: "var(--brown-muted)",
                    fontStyle: "italic",
                  }}
                >
                  No results for &ldquo;{query}&rdquo;
                </li>
              )}
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(p.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "0.5rem 1rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      color: "var(--brown-text)",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "var(--parchment-3)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "none";
                    }}
                  >
                    {displayName(p)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}
