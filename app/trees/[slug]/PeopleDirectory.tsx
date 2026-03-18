"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type PersonRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  maidenName: string | null;
  gender: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
};

export default function PeopleDirectory({
  treeId,
  treeSlug,
  canEdit,
  initialTotal,
}: {
  treeId: string;
  treeSlug: string;
  canEdit: boolean;
  initialTotal: number;
}) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const url = `/api/trees/${treeId}/people?q=${encodeURIComponent(q)}&page=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setPeople(data.people);
          setTotal(data.total);
        }
      } finally {
        setLoading(false);
      }
    },
    [treeId],
  );

  useEffect(() => {
    search("");
  }, [search]);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  }

  function displayName(p: PersonRow): string {
    const parts = [p.firstName, p.lastName].filter(Boolean);
    if (parts.length === 0) return "(unnamed)";
    if (p.maidenName && p.maidenName !== p.lastName) {
      return `${parts.join(" ")} (née ${p.maidenName})`;
    }
    return parts.join(" ");
  }

  function lifespan(p: PersonRow): string {
    if (!p.birthDate && !p.deathDate) return "";
    const b = p.birthDate ? formatYear(p.birthDate) : "?";
    const d = p.deathDate ? formatYear(p.deathDate) : "";
    return d ? `${b}–${d}` : `b. ${b}`;
  }

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <h2
          className="font-ui"
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color: "var(--brown-muted)",
            flexShrink: 0,
          }}
        >
          All people
          {total > 0 && (
            <span style={{ marginLeft: "0.5em", fontWeight: 400, textTransform: "none" }}>
              ({total.toLocaleString()})
            </span>
          )}
        </h2>
        <input
          type="search"
          placeholder="Search by name…"
          value={query}
          onChange={handleSearch}
          style={{
            flex: 1,
            minWidth: "160px",
            maxWidth: "24rem",
            padding: "0.5rem 0.875rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--cream-border)",
            background: "var(--surface-raised)",
            color: "var(--text-primary)",
            fontSize: "0.9375rem",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--forest)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--cream-border)")}
        />
      </div>

      {loading && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>Searching…</p>
      )}

      {!loading && people.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            border: "2px dashed var(--cream-border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          {query ? (
            <p style={{ color: "var(--text-muted)" }}>No people match &ldquo;{query}&rdquo;</p>
          ) : (
            <>
              <p
                className="font-narrative"
                style={{ color: "var(--brown-muted)", fontSize: "1.125rem", marginBottom: "1.25rem" }}
              >
                No people in this tree yet.
              </p>
              {canEdit && (
                <Link
                  href={`/trees/${treeSlug}/people/new`}
                  style={{
                    padding: "0.625rem 1.5rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--forest)",
                    color: "#fff",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Add the first person
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {!loading && people.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {people.map((p) => (
            <Link
              key={p.id}
              href={`/trees/${treeSlug}/people/${p.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid transparent",
                background: "var(--surface-raised)",
                textDecoration: "none",
                transition: "border-color var(--duration-short) var(--ease-out), background var(--duration-short) var(--ease-out)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--cream-border)";
                (e.currentTarget as HTMLElement).style.background = "var(--parchment-dark)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
              }}
            >
              <GenderDot gender={p.gender} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.3 }}>
                  {displayName(p)}
                </p>
                {p.birthPlace && (
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{p.birthPlace}</p>
                )}
              </div>
              {lifespan(p) && (
                <span
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    flexShrink: 0,
                  }}
                >
                  {lifespan(p)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function GenderDot({ gender }: { gender: string | null }) {
  const color =
    gender === "M" ? "var(--color-info)" : gender === "F" ? "#a05070" : "var(--cream-border)";
  return (
    <span
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

function formatYear(date: string): string {
  // Dates may be YYYY, YYYY-MM, YYYY-MM-DD, or free text like "Abt 1850"
  const m = date.match(/\b(\d{4})\b/);
  return m ? m[1] : date;
}
