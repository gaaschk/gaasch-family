"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.1;
const PAN_STEP = 20;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function ChartZoomWrapper({ children }: Props) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Touch pinch state
  const touchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  const adjustZoom = useCallback((delta: number) => {
    setZoom((z) => clamp(z + delta, MIN_ZOOM, MAX_ZOOM));
  }, []);

  // Mouse wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => clamp(z + delta, MIN_ZOOM, MAX_ZOOM));
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Touch pinch zoom
  function getTouchDist(touches: React.TouchList) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches);
      touchStart.current = { dist, zoom };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && touchStart.current) {
      const dist = getTouchDist(e.touches);
      const delta = dist - touchStart.current.dist;
      if (Math.abs(delta) < 5) return; // threshold
      const scale = (dist / touchStart.current.dist) * touchStart.current.zoom;
      setZoom(clamp(scale, MIN_ZOOM, MAX_ZOOM));
    }
  }

  function handleTouchEnd() {
    touchStart.current = null;
  }

  // Keyboard zoom/pan
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        adjustZoom(ZOOM_STEP);
      } else if (e.key === "-") {
        e.preventDefault();
        adjustZoom(-ZOOM_STEP);
      } else if (e.key === "0") {
        e.preventDefault();
        reset();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPanX((x) => x - PAN_STEP);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPanX((x) => x + PAN_STEP);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setPanY((y) => y - PAN_STEP);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setPanY((y) => y + PAN_STEP);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adjustZoom, reset]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover tracks show/hide of controls
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Scrollable + zoomable container */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ overflow: "hidden", cursor: zoom !== 1 ? "grab" : "default" }}
      >
        <div
          style={{
            transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
            transformOrigin: "top left",
            transition: "transform 60ms linear",
          }}
        >
          {children}
        </div>
      </div>

      {/* Floating controls — appear on hover */}
      {/* biome-ignore lint/a11y/useSemanticElements: div used for layout + styling, not fieldset */}
      <div
        role="group"
        aria-label="Zoom controls"
        style={{
          position: "absolute",
          bottom: "12px",
          right: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          opacity: showControls ? 1 : 0,
          transition: "opacity 150ms ease",
          pointerEvents: showControls ? "auto" : "none",
          zIndex: 10,
        }}
      >
        {(
          [
            {
              label: "+",
              action: () => adjustZoom(ZOOM_STEP),
              title: "Zoom in",
            },
            {
              label: "−",
              action: () => adjustZoom(-ZOOM_STEP),
              title: "Zoom out",
            },
            { label: "↺", action: reset, title: "Reset zoom" },
          ] as const
        ).map(({ label, action, title }) => (
          <button
            key={label}
            type="button"
            title={title}
            onClick={action}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-md, 6px)",
              border: "1px solid var(--border)",
              background: "var(--surface-raised, var(--parchment-2))",
              color: "var(--brown-text)",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-ui, inherit)",
              lineHeight: 1,
            }}
            onFocus={() => setShowControls(true)}
            onBlur={() => setShowControls(false)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
