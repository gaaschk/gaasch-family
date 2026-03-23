"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ChartMinimap from "./ChartMinimap";
import ChartZoomWrapper from "./ChartZoomWrapper";
import {
  type AncestorNode,
  bloodlinePath,
  type DescNode,
  flatten,
  leafCount,
  lifespanText,
} from "./chart-utils";
import GenerationControls from "./GenerationControls";
import PersonPicker from "./PersonPicker";
import PersonSlideOver from "./PersonSlideOver";

type DescLayoutNode = {
  node: DescNode;
  gen: number;
  yCenter: number;
  parentId: string | null;
};

const BOX_W = 180;
const BOX_H = 56;
const GEN_GAP = 60;

function buildDescLayout(
  root: DescNode,
  maxGen: number,
  svgH: number,
): DescLayoutNode[] {
  const totalLeaves =
    root.children.reduce((s, c) => s + leafCount(c, maxGen - 1), 0) || 1;
  const slotH = Math.max(BOX_H + 16, svgH / totalLeaves);
  const totalH = Math.max(svgH, totalLeaves * slotH);
  const yOffset = (totalH - totalLeaves * slotH) / 2;
  const result: DescLayoutNode[] = [];

  function recurse(
    node: DescNode,
    gen: number,
    parentId: string | null,
    slotStart: number,
    slotCount: number,
  ) {
    const yCenter = yOffset + (slotStart + slotCount / 2) * slotH;
    result.push({ node, gen, yCenter, parentId });
    if (gen < maxGen && node.children.length > 0) {
      let cur = slotStart;
      for (const child of node.children) {
        const leaves = leafCount(child, maxGen - gen);
        recurse(child, gen + 1, node.id, cur, leaves);
        cur += leaves;
      }
    }
  }

  let cur = 0;
  for (const child of root.children) {
    const leaves = leafCount(child, maxGen - 1);
    recurse(child, 1, root.id, cur, leaves);
    cur += leaves;
  }
  return result;
}

export default function PedigreeView({
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

  const [ancestorRoot, setAncestorRoot] = useState<AncestorNode | null>(null);
  const [descRoot, setDescRoot] = useState<DescNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
              setAncestorRoot(null);
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
          setAncestorRoot(ancestorData.root);
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
    params.set("view", "pedigree");
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
          Could not load pedigree
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--brown-muted)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!ancestorRoot) {
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

  // Layout constants — declare SVG_H before anything that uses it
  const SVG_H_BASE = 640;
  const totalDescLeaves =
    descRoot && descendantGens > 0
      ? descRoot.children.reduce(
          (s, c) => s + leafCount(c, descendantGens - 1),
          0,
        ) || 1
      : 1;
  const SVG_H =
    descendantGens > 0
      ? Math.max(SVG_H_BASE, totalDescLeaves * (BOX_H + 16) + 80)
      : SVG_H_BASE;

  const rootX =
    descendantGens > 0 ? descendantGens * (BOX_W + GEN_GAP) + 24 : 24;
  const SVG_W =
    (ancestorGens + descendantGens) * (BOX_W + GEN_GAP) + BOX_W + 48;

  // Ancestor layout
  const nodeMap = new Map<number, AncestorNode>();
  flatten(ancestorRoot, 1, ancestorGens, nodeMap);

  function boxPosition(num: number): { x: number; y: number } {
    const gen = Math.floor(Math.log2(num));
    const indexInGen = num - 2 ** gen;
    const x = rootX + gen * (BOX_W + GEN_GAP);
    const y = ((indexInGen + 0.5) / 2 ** gen) * SVG_H - BOX_H / 2;
    return { x, y };
  }

  // Bloodline highlight
  const selectedNum = selectedPersonId
    ? (() => {
        for (const [num, node] of nodeMap) {
          if (node.id === selectedPersonId) return num;
        }
        if (ancestorRoot.id === selectedPersonId) return 1;
        return null;
      })()
    : null;
  const highlightNums = selectedNum ? bloodlinePath(selectedNum) : null;

  // Descendant layout
  const descLayout =
    descendantGens > 0 && descRoot
      ? buildDescLayout(descRoot, descendantGens, SVG_H_BASE)
      : [];

  // Ancestor connector lines
  const connectors: { key: string; d: string; highlighted: boolean }[] = [];
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

    const highlighted =
      (highlightNums?.has(num) && highlightNums.has(parentNum)) ?? false;

    connectors.push({
      key: `anc-${parentNum}-${num}`,
      d: `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`,
      highlighted,
    });
  }

  // Descendant connector lines
  const descConnectors: { key: string; d: string }[] = [];
  const descLayoutMap = new Map<string, DescLayoutNode>();
  for (const item of descLayout) {
    descLayoutMap.set(item.node.id, item);
  }

  const rootCenterY = SVG_H / 2;

  for (const item of descLayout) {
    if (!item.parentId) continue;
    const parentItem = descLayoutMap.get(item.parentId);
    if (!parentItem) {
      // parent is root
      const childX = rootX - item.gen * (BOX_W + GEN_GAP) - BOX_W;
      const x1 = rootX;
      const y1 = rootCenterY;
      const x2 = childX + BOX_W;
      const y2 = item.yCenter;
      const mx = (x1 + x2) / 2;
      descConnectors.push({
        key: `desc-root-${item.node.id}`,
        d: `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`,
      });
    } else {
      const parentX = rootX - parentItem.gen * (BOX_W + GEN_GAP) - BOX_W;
      const childX = rootX - item.gen * (BOX_W + GEN_GAP) - BOX_W;
      const x1 = parentX;
      const y1 = parentItem.yCenter;
      const x2 = childX + BOX_W;
      const y2 = item.yCenter;
      const mx = (x1 + x2) / 2;
      descConnectors.push({
        key: `desc-${parentItem.node.id}-${item.node.id}`,
        d: `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`,
      });
    }
  }

  const rootY = rootCenterY - BOX_H / 2;
  const rootName =
    [ancestorRoot.firstName, ancestorRoot.lastName].filter(Boolean).join(" ") ||
    "(unnamed)";
  const rootDates = lifespanText(
    ancestorRoot.birthDate,
    ancestorRoot.deathDate,
  );
  const rootSelected = selectedPersonId === ancestorRoot.id;

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={scrollContainerRef}
        style={{
          overflowX: "auto",
          overflowY: "auto",
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-lg)",
          background: "var(--parchment)",
          padding: "1rem",
          maxHeight: "680px",
          position: "relative",
        }}
      >
        <ChartZoomWrapper>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width={SVG_W}
            height={SVG_H}
            style={{ display: "block" }}
            preserveAspectRatio="xMinYMid meet"
          >
            <title>Pedigree chart</title>

            {/* Ancestor connector lines */}
            {connectors.map((c) => (
              <path
                key={c.key}
                d={c.d}
                fill="none"
                stroke={
                  highlightNums !== null
                    ? c.highlighted
                      ? "var(--forest)"
                      : "var(--border)"
                    : "var(--border)"
                }
                strokeWidth={c.highlighted ? 2.5 : 1.5}
                opacity={highlightNums !== null && !c.highlighted ? 0.35 : 1}
              />
            ))}

            {/* Descendant connector lines */}
            {descConnectors.map((c) => (
              <path
                key={c.key}
                d={c.d}
                fill="none"
                stroke="var(--border)"
                strokeWidth={1.5}
              />
            ))}

            {/* Root person box */}
            {/* biome-ignore lint/a11y/useSemanticElements: SVG <g> cannot be replaced by <button> */}
            <g
              onClick={() => handleNodeClick(ancestorRoot.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  handleNodeClick(ancestorRoot.id);
              }}
              tabIndex={0}
              role="button"
              aria-label={`View ${rootName} details`}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={rootX}
                y={rootY}
                width={BOX_W}
                height={BOX_H}
                rx={8}
                fill="var(--forest-bg)"
                stroke={rootSelected ? "var(--forest)" : "var(--forest)"}
                strokeWidth={rootSelected ? 2.5 : 1.5}
              />
              <text
                x={rootX + 10}
                y={rootY + BOX_H / 2 - (rootDates ? 8 : 0)}
                className="font-display"
                style={{
                  fontSize: "13px",
                  fill: "var(--brown-text)",
                  fontWeight: 600,
                }}
                dominantBaseline="central"
              >
                <tspan>
                  {rootName.length > 22
                    ? `${rootName.slice(0, 22)}…`
                    : rootName}
                </tspan>
              </text>
              {rootDates && (
                <text
                  x={rootX + 10}
                  y={rootY + BOX_H / 2 + 10}
                  className="font-mono"
                  style={{ fontSize: "10px", fill: "var(--brown-muted)" }}
                  dominantBaseline="central"
                >
                  {rootDates}
                </text>
              )}
            </g>

            {/* Ancestor person boxes (num > 1) */}
            {Array.from(nodeMap.entries())
              .filter(([num]) => num !== 1)
              .map(([num, node]) => {
                const { x, y } = boxPosition(num);
                const name =
                  [node.firstName, node.lastName].filter(Boolean).join(" ") ||
                  "(unnamed)";
                const dates = lifespanText(node.birthDate, node.deathDate);
                const isOnPath = highlightNums?.has(num);
                const isSelected = selectedPersonId === node.id;

                return (
                  // biome-ignore lint/a11y/useSemanticElements: SVG <g> cannot be replaced by <button>
                  <g
                    key={num}
                    onClick={() => handleNodeClick(node.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        handleNodeClick(node.id);
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View ${name} details`}
                    style={{ cursor: "pointer" }}
                    opacity={highlightNums !== null && !isOnPath ? 0.35 : 1}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={BOX_W}
                      height={BOX_H}
                      rx={8}
                      fill="var(--parchment-2)"
                      stroke={
                        isSelected || isOnPath
                          ? "var(--forest)"
                          : "var(--border)"
                      }
                      strokeWidth={isSelected || isOnPath ? 1.5 : 1}
                    />
                    <text
                      x={x + 10}
                      y={y + BOX_H / 2 - (dates ? 8 : 0)}
                      className="font-display"
                      style={{
                        fontSize: "13px",
                        fill: "var(--brown-text)",
                        fontWeight: 400,
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

            {/* Empty ancestor placeholders */}
            {Array.from({ length: ancestorGens }, (_, gen) =>
              Array.from({ length: 2 ** gen }, (__, idx) => {
                const num = 2 ** gen + idx;
                if (num === 1) return null;
                if (nodeMap.has(num)) return null;
                const parentNum = Math.floor(num / 2);
                if (gen > 0 && !nodeMap.has(parentNum)) return null;
                if (gen === 0) return null;
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

            {/* Descendant person boxes */}
            {descLayout.map((item) => {
              const x = rootX - item.gen * (BOX_W + GEN_GAP) - BOX_W;
              const y = item.yCenter - BOX_H / 2;
              const name =
                [item.node.firstName, item.node.lastName]
                  .filter(Boolean)
                  .join(" ") || "(unnamed)";
              const dates = lifespanText(
                item.node.birthDate,
                item.node.deathDate,
              );

              return (
                // biome-ignore lint/a11y/useSemanticElements: SVG <g> cannot be replaced by <button>
                <g
                  key={`desc-box-${item.node.id}`}
                  onClick={() => handleNodeClick(item.node.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleNodeClick(item.node.id);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View ${name} details`}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={BOX_W}
                    height={BOX_H}
                    rx={8}
                    fill="var(--parchment-2)"
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  <text
                    x={x + 10}
                    y={y + BOX_H / 2 - (dates ? 8 : 0)}
                    className="font-display"
                    style={{
                      fontSize: "13px",
                      fill: "var(--brown-text)",
                      fontWeight: 400,
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

            {/* No children placeholder */}
            {descendantGens > 0 &&
              descRoot &&
              descRoot.children.length === 0 && (
                <text
                  x={rootX - (BOX_W + GEN_GAP) / 2}
                  y={rootCenterY}
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
              )}
          </svg>
        </ChartZoomWrapper>

        {/* Minimap */}
        <ChartMinimap
          ancestorGens={ancestorGens}
          ancestorRoot={ancestorRoot}
          svgW={SVG_W}
          svgH={SVG_H}
          boxW={BOX_W}
          boxH={BOX_H}
          genGap={GEN_GAP}
          rootX={rootX}
          scrollContainerRef={scrollContainerRef}
        />
      </div>

      <GenerationControls
        ancestorGens={ancestorGens}
        descendantGens={descendantGens}
        treeSlug={treeSlug}
        view="pedigree"
        root={rootPersonId}
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
