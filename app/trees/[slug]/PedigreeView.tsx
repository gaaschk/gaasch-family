"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import PersonPicker from "./PersonPicker";

type AncestorNode = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  gender: string | null;
  father: AncestorNode | null;
  mother: AncestorNode | null;
};

const BOX_W = 180;
const BOX_H = 56;
const GEN_GAP = 60;
const MAX_GEN = 4;
const SVG_H = 640;
const SVG_W = MAX_GEN * (BOX_W + GEN_GAP) + BOX_W + 48;

function flatten(
  node: AncestorNode | null,
  num: number,
  maxGen: number,
  map: Map<number, AncestorNode>,
) {
  if (!node || Math.floor(Math.log2(num)) >= maxGen) return;
  map.set(num, node);
  flatten(node.father, num * 2, maxGen, map);
  flatten(node.mother, num * 2 + 1, maxGen, map);
}

function boxPosition(num: number): { x: number; y: number } {
  const gen = Math.floor(Math.log2(num));
  const indexInGen = num - 2 ** gen;
  const x = gen * (BOX_W + GEN_GAP) + 24;
  const y = ((indexInGen + 0.5) / 2 ** gen) * SVG_H - BOX_H / 2;
  return { x, y };
}

function formatYear(date: string): string {
  const m = date.match(/\b(\d{4})\b/);
  return m ? m[1] : date;
}

function lifespanText(
  birthDate: string | null,
  deathDate: string | null,
): string {
  if (!birthDate && !deathDate) return "";
  const b = birthDate ? formatYear(birthDate) : "?";
  const d = deathDate ? formatYear(deathDate) : "";
  return d ? `${b}–${d}` : `b. ${b}`;
}

export default function PedigreeView({
  treeId,
  treeSlug,
  rootPersonId,
}: {
  treeId: string;
  treeSlug: string;
  rootPersonId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [root, setRoot] = useState<AncestorNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        let personId = rootPersonId;
        if (!personId) {
          const listRes = await fetch(`/api/trees/${treeId}/people?page=1`);
          if (!listRes.ok) throw new Error("Could not load people list");
          const listData = await listRes.json();
          if (!listData.people || listData.people.length === 0) {
            if (!cancelled) {
              setRoot(null);
              setLoading(false);
            }
            return;
          }
          personId = listData.people[0].id as string;
        }

        const res = await fetch(
          `/api/trees/${treeId}/ancestors?rootPersonId=${personId}&generations=4`,
        );
        if (!res.ok) throw new Error("Could not load ancestors");
        const data = await res.json();
        if (!cancelled) setRoot(data.root);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [treeId, rootPersonId]);

  function navigateToRoot(personId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "pedigree");
    params.set("root", personId);
    router.push(`/trees/${treeSlug}?${params.toString()}`);
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 2rem",
          color: "var(--brown-muted)",
          fontSize: "0.9375rem",
        }}
      >
        Loading ancestors…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "2rem",
          borderRadius: "var(--radius-lg)",
          background: "var(--parchment-2)",
          border: "1px solid var(--border)",
          color: "var(--brown-text)",
        }}
      >
        <p style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
          Could not load pedigree
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--brown-muted)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!root) {
    return (
      <div
        style={{
          padding: "4rem 2rem",
          textAlign: "center",
          color: "var(--brown-muted)",
        }}
      >
        No people found in this tree. Add a person to get started.
      </div>
    );
  }

  const nodeMap = new Map<number, AncestorNode>();
  flatten(root, 1, MAX_GEN, nodeMap);

  // Build connector paths
  const connectors: { key: string; d: string }[] = [];
  for (const [num] of nodeMap) {
    if (num === 1) continue;
    const parentNum = Math.floor(num / 2);
    if (!nodeMap.has(parentNum)) continue;

    const parent = boxPosition(parentNum);
    const child = boxPosition(num);

    const x1 = parent.x + BOX_W;
    const y1 = parent.y + BOX_H / 2;
    const x2 = child.x;
    const y2 = child.y + BOX_H / 2;
    const mx = (x1 + x2) / 2;

    connectors.push({
      key: `${parentNum}-${num}`,
      d: `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`,
    });
  }

  return (
    <div>
      <div
        style={{
          overflowX: "auto",
          overflowY: "auto",
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-lg)",
          background: "var(--parchment)",
          padding: "1rem",
          maxHeight: "680px",
        }}
      >
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", maxHeight: "640px", display: "block" }}
          preserveAspectRatio="xMinYMid meet"
        >
          <title>Pedigree chart</title>

          {/* Connector lines */}
          {connectors.map((c) => (
            <path
              key={c.key}
              d={c.d}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1.5}
            />
          ))}

          {/* Person boxes */}
          {Array.from(nodeMap.entries()).map(([num, node]) => {
            const { x, y } = boxPosition(num);
            const name =
              [node.firstName, node.lastName].filter(Boolean).join(" ") ||
              "(unnamed)";
            const dates = lifespanText(node.birthDate, node.deathDate);
            const isRoot = num === 1;

            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG <g> cannot be replaced by <button>
              <g
                key={num}
                onClick={() => navigateToRoot(node.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    navigateToRoot(node.id);
                }}
                tabIndex={0}
                role="button"
                aria-label={`View ${name} as root`}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={x}
                  y={y}
                  width={BOX_W}
                  height={BOX_H}
                  rx={8}
                  fill={isRoot ? "var(--forest-bg)" : "var(--parchment-2)"}
                  stroke={isRoot ? "var(--forest)" : "var(--border)"}
                  strokeWidth={isRoot ? 1.5 : 1}
                />
                <text
                  x={x + 10}
                  y={y + BOX_H / 2 - (dates ? 8 : 0)}
                  className="font-display"
                  style={{
                    fontSize: "13px",
                    fill: "var(--brown-text)",
                    fontWeight: isRoot ? 600 : 400,
                  }}
                  dominantBaseline="central"
                >
                  <tspan>
                    {name.length > 22 ? `${name.slice(0, 22)}…` : name}
                  </tspan>
                </text>
                {dates && (
                  <text
                    x={x + 10}
                    y={y + BOX_H / 2 + 10}
                    className="font-mono"
                    style={{ fontSize: "10px", fill: "var(--brown-muted)" }}
                    dominantBaseline="central"
                  >
                    {dates}
                  </text>
                )}
              </g>
            );
          })}

          {/* Empty parent placeholders at gen 1-3 */}
          {Array.from({ length: MAX_GEN }, (_, gen) =>
            Array.from({ length: 2 ** gen }, (__, idx) => {
              const num = 2 ** gen + idx;
              if (nodeMap.has(num)) return null;
              // Only show empty boxes if parent exists
              const parentNum = Math.floor(num / 2);
              if (gen > 0 && !nodeMap.has(parentNum)) return null;
              if (gen === 0) return null; // root always present
              const { x, y } = boxPosition(num);
              return (
                <g key={`empty-${num}`}>
                  <rect
                    x={x}
                    y={y}
                    width={BOX_W}
                    height={BOX_H}
                    rx={8}
                    fill="transparent"
                    stroke="var(--border-light)"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                  />
                  <text
                    x={x + BOX_W / 2}
                    y={y + BOX_H / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: "11px", fill: "var(--border)" }}
                  >
                    Not recorded
                  </text>
                </g>
              );
            }),
          )}
        </svg>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <PersonPicker
          treeId={treeId}
          treeSlug={treeSlug}
          label="Change root person:"
        />
      </div>
    </div>
  );
}
