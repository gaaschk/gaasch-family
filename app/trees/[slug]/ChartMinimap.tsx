"use client";

import { useEffect, useState } from "react";
import type { AncestorNode } from "./chart-utils";
import { flatten } from "./chart-utils";

const MINIMAP_W = 140;
const MINIMAP_H = 80;
const SCALE = 1 / 6;

type Props = {
  ancestorGens: number;
  ancestorRoot: AncestorNode;
  svgW: number;
  svgH: number;
  boxW: number;
  boxH: number;
  genGap: number;
  rootX: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
};

export default function ChartMinimap({
  ancestorGens,
  ancestorRoot,
  svgW,
  svgH,
  boxW,
  boxH,
  genGap,
  rootX,
  scrollContainerRef,
}: Props) {
  const [viewport, setViewport] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Track scroll container viewport
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setViewport({
        x: el.scrollLeft,
        y: el.scrollTop,
        w: el.clientWidth,
        h: el.clientHeight,
      });
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollContainerRef]);

  if (isMobile) return null;
  if (ancestorGens < 4) return null;

  // Build minimap nodes
  const nodeMap = new Map<number, AncestorNode>();
  flatten(ancestorRoot, 1, ancestorGens, nodeMap);

  function boxPosition(num: number): { x: number; y: number } {
    const gen = Math.floor(Math.log2(num));
    const indexInGen = num - 2 ** gen;
    const x = rootX + gen * (boxW + genGap);
    const y = ((indexInGen + 0.5) / 2 ** gen) * svgH - boxH / 2;
    return { x, y };
  }

  // Viewport rect in minimap coordinates
  const vx = viewport.x * SCALE;
  const vy = viewport.y * SCALE;
  const vw = viewport.w * SCALE;
  const vh = viewport.h * SCALE;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: "12px",
        right: "12px",
        width: `${MINIMAP_W}px`,
        height: `${MINIMAP_H}px`,
        background: "var(--parchment-2)",
        border: "1px solid var(--border-light)",
        borderRadius: "var(--radius-md, 6px)",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      <svg
        width={MINIMAP_W}
        height={MINIMAP_H}
        viewBox={`0 0 ${svgW * SCALE} ${svgH * SCALE}`}
        style={{ display: "block" }}
        preserveAspectRatio="xMinYMid meet"
        aria-hidden="true"
      >
        {/* Root box */}
        {(() => {
          const x = rootX * SCALE;
          const y = (svgH / 2 - boxH / 2) * SCALE;
          return (
            <rect
              x={x}
              y={y}
              width={boxW * SCALE}
              height={boxH * SCALE}
              rx={2}
              fill="var(--forest-bg)"
              stroke="var(--forest)"
              strokeWidth={0.5}
            />
          );
        })()}

        {/* Ancestor boxes */}
        {Array.from(nodeMap.entries())
          .filter(([num]) => num !== 1)
          .map(([num]) => {
            const { x, y } = boxPosition(num);
            return (
              <rect
                key={num}
                x={x * SCALE}
                y={y * SCALE}
                width={boxW * SCALE}
                height={boxH * SCALE}
                rx={2}
                fill="var(--parchment-3)"
                stroke="var(--border-light)"
                strokeWidth={0.5}
              />
            );
          })}

        {/* Viewport indicator */}
        <rect
          x={vx}
          y={vy}
          width={vw}
          height={vh}
          fill="var(--forest)"
          fillOpacity={0.15}
          stroke="var(--forest)"
          strokeWidth={0.75}
          rx={1}
        />
      </svg>
    </div>
  );
}
