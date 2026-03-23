"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type TreeItem = {
  id: string;
  name: string;
  slug: string;
};

export default function TreeSwitcher({
  currentSlug,
  trees,
}: {
  currentSlug: string;
  trees: TreeItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0",
          fontSize: "0.75rem",
          fontFamily: "var(--font-ui, inherit)",
          color: "var(--text-link, var(--forest, #2D4A35))",
          lineHeight: 1.4,
        }}
      >
        My Trees
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 50,
            background: "var(--surface-raised, #F2EBE0)",
            border: "1px solid var(--cream-border, #C4B09A)",
            borderRadius: "var(--radius-lg, 10px)",
            boxShadow: "0 4px 16px rgba(44,26,14,0.12)",
            minWidth: "200px",
            maxWidth: "280px",
            overflow: "hidden",
          }}
        >
          {trees.length === 0 ? (
            <p
              style={{
                padding: "0.75rem 1rem",
                fontSize: "0.8125rem",
                color: "var(--brown-muted, #7A6653)",
              }}
            >
              No other trees
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: "0.375rem 0" }}>
              {trees.map((tree) => {
                const isCurrent = tree.slug === currentSlug;
                return (
                  <li key={tree.id}>
                    {isCurrent ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 1rem",
                          fontSize: "0.875rem",
                          color: "var(--brown-text, #2C1A0E)",
                          fontWeight: 500,
                          cursor: "default",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          aria-hidden="true"
                          style={{ flexShrink: 0 }}
                        >
                          <path
                            d="M2 6L5 9L10 3"
                            stroke="var(--forest, #2D4A35)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {tree.name}
                      </span>
                    ) : (
                      <Link
                        href={`/trees/${tree.slug}`}
                        onClick={() => setOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 1rem",
                          fontSize: "0.875rem",
                          color: "var(--text-secondary, #4A3020)",
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLAnchorElement
                          ).style.background = "var(--surface-hover, #E8DDD0)";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLAnchorElement
                          ).style.background = "transparent";
                        }}
                      >
                        <span
                          style={{
                            width: "12px",
                            flexShrink: 0,
                            display: "inline-block",
                          }}
                        />
                        {tree.name}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Divider + dashboard link */}
          <div
            style={{
              borderTop: "1px solid var(--cream-border-light, #DDD0BE)",
              padding: "0.375rem 0",
            }}
          >
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "0.5rem 1rem",
                fontSize: "0.8125rem",
                color: "var(--brown-muted, #7A6653)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "var(--surface-hover, #E8DDD0)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "transparent";
              }}
            >
              Manage trees →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
