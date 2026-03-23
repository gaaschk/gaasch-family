"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ChartZoomWrapper from "./ChartZoomWrapper";
import {
  type AncestorNode,
  bloodlinePath,
  type DescNode,
  flatten,
  formatYear,
  leafCount,
} from "./chart-utils";
import GenerationControls from "./GenerationControls";
import PersonPicker from "./PersonPicker";
import PersonSlideOver from "./PersonSlideOver";

const CX = 400;
const CY = 400;
const RING_RADII = [0, 75, 150, 225, 300, 370, 440];

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

type DescArcSegment = {
  node: DescNode;
  gen: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  innerR: number;
  outerR: number;
  path: string;
};

function buildDescArcSegments(
  root: DescNode,
  maxGen: number,
): DescArcSegment[] {
  const TOTAL_ARC = 120;
  const START = 120;
  const segments: DescArcSegment[] = [];

  function recurse(
    node: DescNode,
    gen: number,
    arcStart: number,
    arcEnd: number,
  ) {
    segments.push({
      node,
      gen,
      startAngle: arcStart,
      endAngle: arcEnd,
      midAngle: (arcStart + arcEnd) / 2,
      innerR: RING_RADII[gen],
      outerR: RING_RADII[gen + 1],
      path: arcPath(
        CX,
        CY,
        RING_RADII[gen],
        RING_RADII[gen + 1],
        arcStart,
        arcEnd,
      ),
    });
    if (gen < maxGen && node.children.length > 0) {
      const total =
        node.children.reduce((s, c) => s + leafCount(c, maxGen - gen), 0) || 1;
      let cur = arcStart;
      for (const child of node.children) {
        const leaves = leafCount(child, maxGen - gen - 1);
        const childArc = ((arcEnd - arcStart) * leaves) / total;
        recurse(child, gen + 1, cur, cur + childArc);
        cur += childArc;
      }
    }
  }

  const total =
    root.children.reduce((s, c) => s + leafCount(c, maxGen - 1), 0) || 1;
  let cur = START;
  for (const child of root.children) {
    const leaves = leafCount(child, maxGen - 1);
    const childArc = (TOTAL_ARC * leaves) / total;
    recurse(child, 1, cur, cur + childArc);
    cur += childArc;
  }
  return segments;
}

export default function FanChartView({
  treeId,
  treeSlug,
  rootPersonId,
  ancestorGens = 4,
  descendantGens = 0,
}: {
  treeId: string;
  treeSlug: string;
  rootPersonId?: string;
  ancestorGens?: number;
  descendantGens?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [root, setRoot] = useState<AncestorNode | null>(null);
  const [descRoot, setDescRoot] = useState<DescNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNum, setHoveredNum] = useState<number | null>(null);
  const [hoveredDescId, setHoveredDescId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

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
              setDescRoot(null);
              setLoading(false);
            }
            return;
          }
          personId = listData.people[0].id as string;
        }

        const [ancestorRes, descendantRes] = await Promise.all([
          fetch(
            `/api/trees/${treeId}/ancestors?rootPersonId=${personId}&generations=${ancestorGens}`,
          ),
          descendantGens > 0
            ? fetch(
                `/api/trees/${treeId}/descendants?rootPersonId=${personId}&generations=${descendantGens}`,
              )
            : Promise.resolve(null),
        ]);

        if (!ancestorRes.ok) throw new Error("Could not load ancestors");
        if (descendantRes && !descendantRes.ok)
          throw new Error("Could not load descendants");

        const ancestorData = await ancestorRes.json();
        const descendantData = descendantRes
          ? await descendantRes.json()
          : null;

        if (!cancelled) {
          setRoot(ancestorData.root);
          setDescRoot(descendantData ? descendantData.root : null);
        }
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
  }, [treeId, rootPersonId, ancestorGens, descendantGens]);

  function navigateToRoot(personId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "fan");
    params.set("root", personId);
    router.push(`/trees/${treeSlug}?${params.toString()}`);
    setSelectedPersonId(null);
  }

  const handleNodeClick = useCallback((personId: string) => {
    setSelectedPersonId((prev) => (prev === personId ? null : personId));
  }, []);

  const handleCloseSlideOver = useCallback(() => {
    setSelectedPersonId(null);
  }, []);

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
        Loading…
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

  // When descendantGens > 0: ancestors use 210°, descendants use 120°
  const ancestorArcTotal = descendantGens > 0 ? 210 : 240;
  const ancestorStartAngle = descendantGens > 0 ? -105 : -120;

  const nodeMap = new Map<number, AncestorNode>();
  flatten(root, 1, ancestorGens + 1, nodeMap);

  // Build arc segments for ancestors
  const segments: ArcSegment[] = [];
  for (let gen = 1; gen <= ancestorGens; gen++) {
    const count = 2 ** gen;
    const arcSpan = ancestorArcTotal / count;
    const innerR = RING_RADII[gen];
    const outerR = RING_RADII[gen + 1] ?? RING_RADII[RING_RADII.length - 1];

    for (let idx = 0; idx < count; idx++) {
      const num = 2 ** gen + idx;
      const node = nodeMap.get(num);
      if (!node) continue;

      const startAngle = ancestorStartAngle + idx * arcSpan;
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

  // Build descendant arc segments
  const descSegments: DescArcSegment[] =
    descendantGens > 0 && descRoot
      ? buildDescArcSegments(descRoot, descendantGens)
      : [];

  const viewBox = descendantGens > 0 ? "0 0 800 600" : "0 0 800 510";

  const rootName =
    [root.firstName, root.lastName].filter(Boolean).join(" ") || "(unnamed)";
  const rootBirth = root.birthDate ? formatYear(root.birthDate) : "";

  const currentRoot = rootPersonId;

  // Bloodline highlight
  const selectedNum = selectedPersonId
    ? (() => {
        for (const [num, node] of nodeMap) {
          if (node.id === selectedPersonId) return num;
        }
        if (root.id === selectedPersonId) return 1;
        return null;
      })()
    : null;
  const highlightNums = selectedNum ? bloodlinePath(selectedNum) : null;

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-lg)",
          background: "var(--parchment)",
          padding: "1rem",
          overflowX: "auto",
        }}
      >
        <ChartZoomWrapper>
          <svg
            viewBox={viewBox}
            width={800}
            height={descendantGens > 0 ? 600 : 510}
            style={{ display: "block" }}
            preserveAspectRatio="xMidYMid meet"
          >
            <title>Fan chart</title>

            {/* Ancestor arc segments */}
            {segments.map((seg) => {
              const isHovered = hoveredNum === seg.num;
              const isOnPath = highlightNums?.has(seg.num);

              const midR = (seg.innerR + seg.outerR) / 2;
              const textPos = polarToXY(CX, CY, midR, seg.midAngle);
              const name =
                [seg.node.firstName, seg.node.lastName]
                  .filter(Boolean)
                  .join(" ") || "(unnamed)";
              const birth = seg.node.birthDate
                ? formatYear(seg.node.birthDate)
                : "";

              const rotateAngle = seg.midAngle - 90;
              const arcSpanDeg = seg.endAngle - seg.startAngle;
              const showFullText = seg.gen <= 2;
              const showShortText = seg.gen === 3 && arcSpanDeg > 10;

              return (
                // biome-ignore lint/a11y/useSemanticElements: SVG <g> cannot be replaced by <button>
                <g
                  key={seg.num}
                  onClick={() => handleNodeClick(seg.node.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleNodeClick(seg.node.id);
                  }}
                  onMouseEnter={() => setHoveredNum(seg.num)}
                  onMouseLeave={() => setHoveredNum(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View ${name} details`}
                  style={{ cursor: "pointer" }}
                  opacity={highlightNums !== null && !isOnPath ? 0.35 : 1}
                >
                  <path
                    d={seg.path}
                    stroke={isOnPath ? "var(--forest)" : "var(--border)"}
                    strokeWidth={isOnPath ? 1.5 : 0.75}
                    style={{
                      fill: isHovered
                        ? "var(--parchment-3)"
                        : seg.gen % 2 === 1
                          ? "var(--parchment-2)"
                          : "var(--parchment)",
                      transition: "fill 120ms ease",
                    }}
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
                          style={{
                            fontSize: "10px",
                            fill: "var(--brown-muted)",
                          }}
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

            {/* Descendant arc segments */}
            {descSegments.map((seg) => {
              const isHovered = hoveredDescId === seg.node.id;

              const midR = (seg.innerR + seg.outerR) / 2;
              const textPos = polarToXY(CX, CY, midR, seg.midAngle);
              const name =
                [seg.node.firstName, seg.node.lastName]
                  .filter(Boolean)
                  .join(" ") || "(unnamed)";
              const birth = seg.node.birthDate
                ? formatYear(seg.node.birthDate)
                : "";

              const rotateAngle = seg.midAngle - 90;
              const arcSpanDeg = seg.endAngle - seg.startAngle;
              const showFullText = seg.gen <= 2 && arcSpanDeg > 20;
              const showShortText = seg.gen === 3 && arcSpanDeg > 20;

              return (
                // biome-ignore lint/a11y/useSemanticElements: SVG <g> cannot be replaced by <button>
                <g
                  key={`desc-${seg.node.id}-${seg.gen}`}
                  onClick={() => handleNodeClick(seg.node.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleNodeClick(seg.node.id);
                  }}
                  onMouseEnter={() => setHoveredDescId(seg.node.id)}
                  onMouseLeave={() => setHoveredDescId(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View ${name} details`}
                  style={{ cursor: "pointer" }}
                >
                  <path
                    d={seg.path}
                    stroke="var(--border)"
                    strokeWidth={0.75}
                    style={{
                      fill: isHovered
                        ? "var(--parchment-2)"
                        : "var(--parchment-3)",
                      transition: "fill 120ms ease",
                    }}
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
                          style={{
                            fontSize: "10px",
                            fill: "var(--brown-muted)",
                          }}
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

            {/* Empty descendant arc outline when no children */}
            {descendantGens > 0 &&
              descRoot &&
              descRoot.children.length === 0 && (
                <>
                  <path
                    d={arcPath(CX, CY, RING_RADII[1], RING_RADII[2], 120, 240)}
                    fill="none"
                    stroke="var(--border-light)"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                  />
                  <text
                    x={CX}
                    y={CY + (RING_RADII[1] + RING_RADII[2]) / 2 + 20}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{
                      fontSize: "11px",
                      fill: "var(--border)",
                      fontStyle: "italic",
                    }}
                  >
                    No children recorded
                  </text>
                </>
              )}

            {/* Center circle (root / gen 0) */}
            {/* biome-ignore lint/a11y/useSemanticElements: SVG <g> cannot be replaced by <button> */}
            <g
              onClick={() => handleNodeClick(root.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  handleNodeClick(root.id);
              }}
              tabIndex={0}
              role="button"
              aria-label={`View ${rootName} details`}
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
        </ChartZoomWrapper>
      </div>

      <GenerationControls
        ancestorGens={ancestorGens}
        descendantGens={descendantGens}
        treeSlug={treeSlug}
        view="fan"
        root={currentRoot}
      />

      <div style={{ marginTop: "0.75rem" }}>
        <PersonPicker
          treeId={treeId}
          treeSlug={treeSlug}
          label="Change root person:"
        />
      </div>

      {/* Slide-over panel */}
      <PersonSlideOver
        treeId={treeId}
        treeSlug={treeSlug}
        personId={selectedPersonId}
        onClose={handleCloseSlideOver}
        onViewAsRoot={navigateToRoot}
      />
    </div>
  );
}
