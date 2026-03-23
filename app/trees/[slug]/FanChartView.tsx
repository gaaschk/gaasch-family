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

const CX = 400;
const CY = 400;
const RING_RADII = [0, 75, 150, 225, 300, 370];
const MAX_GEN = 4;

// Colors per generation index (1-4)
const GEN_COLORS = ["", "#F2EBE0", "#FAF5EC", "#F2EBE0", "#FAF5EC"];

function polarToXY(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  // angleDeg: 0 = top (12 o'clock), going clockwise
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const p1 = polarToXY(cx, cy, outerR, startDeg);
  const p2 = polarToXY(cx, cy, outerR, endDeg);
  const p3 = polarToXY(cx, cy, innerR, endDeg);
  const p4 = polarToXY(cx, cy, innerR, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

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

function formatYear(date: string): string {
  const m = date.match(/\b(\d{4})\b/);
  return m ? m[1] : date;
}

type ArcSegment = {
  num: number;
  node: AncestorNode;
  gen: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  innerR: number;
  outerR: number;
  path: string;
};

export default function FanChartView({
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
  const [hoveredNum, setHoveredNum] = useState<number | null>(null);

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
    params.set("view", "fan");
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
          Could not load fan chart
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
  flatten(root, 1, MAX_GEN + 1, nodeMap);

  // Build arc segments for gen 1-4
  const segments: ArcSegment[] = [];
  for (let gen = 1; gen <= MAX_GEN; gen++) {
    const count = 2 ** gen;
    const arcSpan = 240 / count;
    const innerR = RING_RADII[gen];
    const outerR = RING_RADII[gen + 1];

    for (let idx = 0; idx < count; idx++) {
      const num = 2 ** gen + idx;
      const node = nodeMap.get(num);
      if (!node) continue;

      const startAngle = -120 + idx * arcSpan;
      const endAngle = startAngle + arcSpan;
      const midAngle = (startAngle + endAngle) / 2;

      segments.push({
        num,
        node,
        gen,
        startAngle,
        endAngle,
        midAngle,
        innerR,
        outerR,
        path: arcPath(CX, CY, innerR, outerR, startAngle, endAngle),
      });
    }
  }

  const rootName =
    [root.firstName, root.lastName].filter(Boolean).join(" ") || "(unnamed)";
  const rootBirth = root.birthDate ? formatYear(root.birthDate) : "";

  return (
    <div>
      <div
        style={{
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-lg)",
          background: "var(--parchment)",
          padding: "1rem",
          overflowX: "auto",
        }}
      >
        <svg
          viewBox="0 0 800 510"
          style={{ width: "100%", maxHeight: "520px", display: "block" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <title>Fan chart</title>

          {/* Arc segments */}
          {segments.map((seg) => {
            const isHovered = hoveredNum === seg.num;
            const baseFill = GEN_COLORS[seg.gen] ?? "#F2EBE0";
            const fill = isHovered ? "#E8DDD0" : baseFill;

            // Text positioning
            const midR = (seg.innerR + seg.outerR) / 2;
            const textPos = polarToXY(CX, CY, midR, seg.midAngle);
            const name =
              [seg.node.firstName, seg.node.lastName]
                .filter(Boolean)
                .join(" ") || "(unnamed)";
            const birth = seg.node.birthDate
              ? formatYear(seg.node.birthDate)
              : "";

            // Rotate text along arc tangent
            const rotateAngle = seg.midAngle - 90;

            const showFullText = seg.gen <= 2;
            const showShortText = seg.gen === 3;
            // gen 4: no text (too small)

            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG <g> cannot be replaced by <button>
              <g
                key={seg.num}
                onClick={() => navigateToRoot(seg.node.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    navigateToRoot(seg.node.id);
                }}
                onMouseEnter={() => setHoveredNum(seg.num)}
                onMouseLeave={() => setHoveredNum(null)}
                tabIndex={0}
                role="button"
                aria-label={`View ${name} as root`}
                style={{ cursor: "pointer" }}
              >
                <path
                  d={seg.path}
                  fill={fill}
                  stroke="#C4B09A"
                  strokeWidth={0.75}
                  style={{ transition: "fill 120ms ease" }}
                />
                {showFullText && (
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${rotateAngle}, ${textPos.x}, ${textPos.y})`}
                    style={{ pointerEvents: "none" }}
                  >
                    <tspan
                      x={textPos.x}
                      dy="-6"
                      className="font-display"
                      style={{ fontSize: "12px", fill: "var(--brown-text)" }}
                    >
                      {name.length > 18 ? `${name.slice(0, 18)}…` : name}
                    </tspan>
                    {birth && (
                      <tspan
                        x={textPos.x}
                        dy="14"
                        className="font-mono"
                        style={{ fontSize: "10px", fill: "var(--brown-muted)" }}
                      >
                        {birth}
                      </tspan>
                    )}
                  </text>
                )}
                {showShortText && (
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${rotateAngle}, ${textPos.x}, ${textPos.y})`}
                    className="font-display"
                    style={{
                      fontSize: "10px",
                      fill: "var(--brown-text)",
                      pointerEvents: "none",
                    }}
                  >
                    {(seg.node.firstName ?? "").slice(0, 10) ||
                      (seg.node.lastName ?? "").slice(0, 10) ||
                      "?"}
                  </text>
                )}
              </g>
            );
          })}

          {/* Center circle (root / gen 0) */}
          {/* biome-ignore lint/a11y/useSemanticElements: SVG <g> cannot be replaced by <button> */}
          <g
            onClick={() => navigateToRoot(root.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigateToRoot(root.id);
            }}
            tabIndex={0}
            role="button"
            aria-label={`${rootName} (root)`}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={CX}
              cy={CY}
              r={RING_RADII[1]}
              fill="var(--forest-bg)"
              stroke="var(--forest)"
              strokeWidth={1.5}
            />
            <text
              x={CX}
              y={CY - 8}
              textAnchor="middle"
              className="font-display"
              style={{
                fontSize: "13px",
                fill: "var(--brown-text)",
                fontWeight: 600,
                pointerEvents: "none",
              }}
            >
              {rootName.length > 18 ? `${rootName.slice(0, 18)}…` : rootName}
            </text>
            {rootBirth && (
              <text
                x={CX}
                y={CY + 10}
                textAnchor="middle"
                className="font-mono"
                style={{
                  fontSize: "10px",
                  fill: "var(--brown-muted)",
                  pointerEvents: "none",
                }}
              >
                {rootBirth}
              </text>
            )}
          </g>
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
