"use client";

import { useEffect, useRef, useState } from "react";
import { lifespanText } from "./chart-utils";
import LineageStoryModal from "./LineageStoryModal";

type PersonDetail = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  birthPlace: string | null;
  deathPlace: string | null;
  gender: string | null;
  occupation: string | null;
  narrative: string | null;
};

type Props = {
  treeId: string;
  treeSlug: string;
  personId: string | null;
  rootPersonId?: string | null;
  onClose: () => void;
  onViewAsRoot: (personId: string) => void;
};

export default function PersonSlideOver({
  treeId,
  treeSlug,
  personId,
  rootPersonId,
  onClose,
  onViewAsRoot,
}: Props) {
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLineageStory, setShowLineageStory] = useState(false);
  const cache = useRef<Map<string, PersonDetail>>(new Map());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!personId) {
      setPerson(null);
      return;
    }

    const cached = cache.current.get(personId);
    if (cached) {
      setPerson(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/trees/${treeId}/people/${personId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Could not load person");
        return r.json();
      })
      .then((data: PersonDetail) => {
        if (!cancelled) {
          cache.current.set(personId, data);
          setPerson(data);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "An error occurred");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [personId, treeId]);

  // Escape key closes panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (personId) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [personId, onClose]);

  // Focus panel when it opens
  useEffect(() => {
    if (personId && panelRef.current) {
      panelRef.current.focus();
    }
  }, [personId]);

  if (!personId) return null;

  const name = person
    ? [person.firstName, person.lastName].filter(Boolean).join(" ") ||
      "(unnamed)"
    : null;
  const dates = person
    ? lifespanText(person.birthDate, person.deathDate)
    : null;

  // Strip HTML tags from narrative for excerpt
  const narrativeText = person?.narrative
    ? person.narrative
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : null;
  const excerpt = narrativeText ? narrativeText.slice(0, 200) : null;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

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
          zIndex: 40,
          background: "transparent",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label={name ? `${name} details` : "Person details"}
        aria-modal="true"
        style={{
          position: "fixed",
          zIndex: 50,
          background: "var(--parchment)",
          border: "1px solid var(--border)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)",
          // Desktop: right side panel
          ...(isMobile
            ? {
                bottom: 0,
                left: 0,
                right: 0,
                borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
                maxHeight: "70vh",
                overflowY: "auto",
              }
            : {
                top: 0,
                right: 0,
                bottom: 0,
                width: "320px",
                overflowY: "auto",
              }),
          padding: "1.25rem",
          outline: "none",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1.125rem",
            color: "var(--brown-muted)",
            lineHeight: 1,
            padding: "4px",
          }}
        >
          ×
        </button>

        {loading && (
          <div
            style={{
              paddingTop: "2rem",
              textAlign: "center",
              color: "var(--brown-muted)",
              fontSize: "0.875rem",
            }}
          >
            Loading…
          </div>
        )}

        {error && (
          <div
            style={{
              paddingTop: "2rem",
              textAlign: "center",
              color: "var(--error, #b91c1c)",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        {person && (
          <>
            {/* Name */}
            <h2
              className="font-display"
              style={{
                fontSize: "1.0625rem",
                fontWeight: 600,
                color: "var(--brown-text)",
                marginBottom: "0.25rem",
                paddingRight: "1.5rem",
                lineHeight: 1.3,
              }}
            >
              {name}
            </h2>

            {/* Dates */}
            {dates && (
              <p
                className="font-mono"
                style={{
                  fontSize: "0.75rem",
                  color: "var(--brown-muted)",
                  marginBottom: "0.75rem",
                }}
              >
                {dates}
              </p>
            )}

            {/* Separator */}
            <hr
              style={{
                border: "none",
                borderTop: "1px solid var(--border-light)",
                marginBottom: "0.75rem",
              }}
            />

            {/* Details */}
            <div
              style={{
                display: "grid",
                gap: "0.375rem",
                marginBottom: "0.875rem",
              }}
            >
              {person.birthPlace && (
                <Detail label="Born" value={person.birthPlace} />
              )}
              {person.deathPlace && person.deathDate && (
                <Detail label="Died" value={person.deathPlace} />
              )}
              {person.occupation && (
                <Detail label="Occupation" value={person.occupation} />
              )}
            </div>

            {/* Narrative excerpt */}
            {excerpt && (
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--brown-text)",
                  lineHeight: 1.55,
                  marginBottom: "0.875rem",
                  opacity: 0.85,
                }}
              >
                {excerpt}
                {narrativeText && narrativeText.length > 200 ? "…" : ""}
              </p>
            )}

            {/* Footer actions */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginTop: "auto",
              }}
            >
              <a
                href={`/trees/${treeSlug}/people/${person.id}`}
                style={{
                  display: "block",
                  textAlign: "center",
                  fontSize: "0.8125rem",
                  color: "var(--forest)",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                → Full profile
              </a>
              <button
                type="button"
                onClick={() => onViewAsRoot(person.id)}
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
                View as root
              </button>

              {rootPersonId && person.id !== rootPersonId && (
                <button
                  type="button"
                  onClick={() => setShowLineageStory(true)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "var(--amber-bg, #fdf6e3)",
                    border: "1px solid var(--amber, #b45309)",
                    borderRadius: "var(--radius-md, 6px)",
                    color: "var(--brown-text)",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "var(--font-ui, inherit)",
                  }}
                >
                  Generate lineage story
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {showLineageStory && person && rootPersonId && (
        <LineageStoryModalWrapper
          treeId={treeId}
          fromPerson={person}
          toPersonId={rootPersonId}
          onClose={() => setShowLineageStory(false)}
        />
      )}
    </>
  );
}

// Wrapper that fetches the root person's name for the modal
function LineageStoryModalWrapper({
  treeId,
  fromPerson,
  toPersonId,
  onClose,
}: {
  treeId: string;
  fromPerson: PersonDetail;
  toPersonId: string;
  onClose: () => void;
}) {
  const [toPerson, setToPerson] = useState<{
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/trees/${treeId}/people/${toPersonId}`)
      .then((r) => r.json())
      .then((data) =>
        setToPerson({
          id: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
        }),
      )
      .catch(() =>
        setToPerson({ id: toPersonId, firstName: null, lastName: null }),
      );
  }, [treeId, toPersonId]);

  if (!toPerson) return null;

  return (
    <LineageStoryModal
      treeId={treeId}
      fromPerson={{
        id: fromPerson.id,
        firstName: fromPerson.firstName,
        lastName: fromPerson.lastName,
      }}
      toPerson={toPerson}
      onClose={onClose}
    />
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--brown-muted)",
          flexShrink: 0,
          fontFamily: "var(--font-ui, inherit)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "0.8125rem",
          color: "var(--brown-text)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
