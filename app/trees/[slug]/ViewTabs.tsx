"use client";

import { useRouter, useSearchParams } from "next/navigation";

type TabId = "list" | "pedigree" | "fan";

const TABS: { id: TabId; label: string }[] = [
  { id: "list", label: "Directory" },
  { id: "pedigree", label: "Pedigree" },
  { id: "fan", label: "Fan Chart" },
];

export default function ViewTabs({
  slug,
  currentView,
}: {
  slug: string;
  currentView: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleTabClick(view: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    // Reset root when switching views so the chart re-selects naturally
    params.delete("root");
    router.push(`/trees/${slug}?${params.toString()}`);
  }

  return (
    <div
      role="tablist"
      aria-label="Tree views"
      style={{
        display: "flex",
        gap: "1.5rem",
        marginTop: "0.5rem",
      }}
    >
      {TABS.map((tab) => {
        const isActive = currentView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleTabClick(tab.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: isActive
                ? "2px solid var(--forest)"
                : "2px solid transparent",
              padding: "0.5rem 0.25rem",
              fontSize: "0.875rem",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--brown-text)" : "var(--brown-muted)",
              cursor: "pointer",
              fontFamily: "var(--font-ui, inherit)",
              lineHeight: 1.4,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
