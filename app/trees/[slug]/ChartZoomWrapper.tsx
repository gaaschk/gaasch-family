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
  const [showPanHint, setShowPanHint] = useState(false);

  // Mouse drag state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasEverDragged = useRef(false);
  const panHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch pinch/drag state
  const touchStart = useRef<{
    dist: number;
    zoom: number;
    x?: number;
    y?: number;
    panX?: number;
    panY?: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setShowPanHint(false);
  }, []);

  const adjustZoom = useCallback((delta: number) => {
    setZoom((z) => clamp(z + delta, MIN_ZOOM, MAX_ZOOM));
  }, []);

  // Show pan hint when zooming in for the first time
  useEffect(() => {
    if (zoom > 1 && !hasEverDragged.current) {
      setShowPanHint(true);
      if (panHintTimer.current) clearTimeout(panHintTimer.current);
      panHintTimer.current = setTimeout(() => setShowPanHint(false), 3000);
    } else if (zoom <= 1) {
      setShowPanHint(false);
      if (panHintTimer.current) clearTimeout(panHintTimer.current);
    }
    return () => {
      if (panHintTimer.current) clearTimeout(panHintTimer.current);
    };
  }, [zoom]);

  function getMaxPan() {
    const el = containerRef.current;
    if (!el) return { maxX: 0, maxY: 0 };
    const maxX = (el.clientWidth * (zoom - 1)) / 2;
    const maxY = (el.clientHeight * (zoom - 1)) / 2;
    return { maxX, maxY };
  }

  function clampPan(x: number, y: number) {
    const { maxX, maxY } = getMaxPan();
    return {
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
    };
  }

  // Mouse drag handlers
  function handleMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, panX, panY };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const rawX = dragStart.current.panX + (e.clientX - dragStart.current.x);
    const rawY = dragStart.current.panY + (e.clientY - dragStart.current.y);
    const { x, y } = clampPan(rawX, rawY);
    setPanX(x);
    setPanY(y);
  }

  function handleMouseUp() {
    if (isDragging.current) {
      if (!hasEverDragged.current) {
        hasEverDragged.current = true;
        setShowPanHint(false);
        if (panHintTimer.current) clearTimeout(panHintTimer.current);
      }
      isDragging.current = false;
    }
  }

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

  // Touch pinch zoom + single-finger drag
  function getTouchDist(touches: React.TouchList) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches);
      touchStart.current = { dist, zoom };
    } else if (e.touches.length === 1 && zoom > 1) {
      touchStart.current = {
        dist: 0,
        zoom,
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX,
        panY,
      };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && touchStart.current) {
      const dist = getTouchDist(e.touches);
      const delta = dist - touchStart.current.dist;
      if (Math.abs(delta) < 5) return;
      const scale = (dist / touchStart.current.dist) * touchStart.current.zoom;
      setZoom(clamp(scale, MIN_ZOOM, MAX_ZOOM));
    } else if (
      e.touches.length === 1 &&
      touchStart.current &&
      touchStart.current.x !== undefined
    ) {
      const rawX =
        (touchStart.current.panX ?? 0) +
        (e.touches[0].clientX - touchStart.current.x);
      const rawY =
        (touchStart.current.panY ?? 0) +
        (e.touches[0].clientY - (touchStart.current.y ?? 0));
      const { x, y } = clampPan(rawX, rawY);
      setPanX(x);
      setPanY(y);
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

  const isDraggingState = zoom > 1;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover tracks show/hide of controls
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        setShowControls(false);
        handleMouseUp();
      }}
    >
      {/* Scrollable + zoomable container */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-to-pan interaction */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          overflow: "hidden",
          cursor: isDraggingState
            ? isDragging.current
              ? "grabbing"
              : "grab"
            : "default",
          userSelect: "none",
        }}
      >
        <div
          style={{
            transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
            transformOrigin: "top left",
            transition: isDragging.current ? "none" : "transform 60ms linear",
          }}
        >
          {children}
        </div>
      </div>

      {/* Pan hint */}
      {showPanHint && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: "0.8125rem",
            fontFamily: "var(--font-ui, inherit)",
            padding: "0.375rem 0.75rem",
            borderRadius: "var(--radius-md, 6px)",
            pointerEvents: "none",
            zIndex: 20,
            whiteSpace: "nowrap",
          }}
        >
          Drag to pan
        </div>
      )}

      {/* Floating controls — appear on hover, now at bottom-left */}
      {/* biome-ignore lint/a11y/useSemanticElements: div used for layout + styling, not fieldset */}
      <div
        role="group"
        aria-label="Zoom controls"
        style={{
          position: "absolute",
          bottom: "12px",
          left: "12px",
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
