import {
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DOUBLE_TAP_DELAY = 280;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function distanceBetween(pointA, pointB) {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

function centerBetween(pointA, pointB) {
  return {
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2,
  };
}

export default function ProductImagePreview({
  alt,
  className = "",
  imageClassName = "",
  onZoomOpen,
  showZoomHint = false,
  sizes,
  src,
  zoomLabel = "Ampliar imagem",
}) {
  const [open,
    setOpen] =
    useState(false);
  const [zoom,
    setZoom] =
    useState(MIN_ZOOM);
  const [position,
    setPosition] =
    useState({ x: 0, y: 0 });
  const viewportRef =
    useRef(null);
  const pointersRef =
    useRef(new Map());
  const zoomRef =
    useRef(MIN_ZOOM);
  const positionRef =
    useRef({ x: 0, y: 0 });
  const gestureRef =
    useRef({
      dragStart: { x: 0, y: 0 },
      hasMoved: false,
      hasPinched: false,
      startCenter: { x: 0, y: 0 },
      startDistance: 1,
      startPosition: { x: 0, y: 0 },
      startZoom: MIN_ZOOM,
    });
  const lastTapRef =
    useRef(0);

  const zoomHintClass = showZoomHint
    ? "opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 sm:group-focus-visible/image:opacity-100"
    : "opacity-0 group-hover/image:opacity-100 group-focus-visible/image:opacity-100";

  function clampPosition(nextPosition, nextZoom = zoomRef.current) {
    if (nextZoom <= MIN_ZOOM) {
      return { x: 0, y: 0 };
    }

    const viewportRect =
      viewportRef.current?.getBoundingClientRect();
    const viewportWidth =
      viewportRect?.width || window.innerWidth;
    const viewportHeight =
      viewportRect?.height || window.innerHeight;
    const maxX =
      (viewportWidth * (nextZoom - 1)) / 2;
    const maxY =
      (viewportHeight * (nextZoom - 1)) / 2;

    return {
      x: clamp(nextPosition.x, -maxX, maxX),
      y: clamp(nextPosition.y, -maxY, maxY),
    };
  }

  function applyZoom(nextZoom, nextPosition = positionRef.current) {
    const normalizedZoom =
      clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const normalizedPosition =
      normalizedZoom <= MIN_ZOOM
        ? { x: 0, y: 0 }
        : clampPosition(nextPosition, normalizedZoom);

    zoomRef.current =
      normalizedZoom;
    positionRef.current =
      normalizedPosition;
    setZoom(normalizedZoom);
    setPosition(normalizedPosition);
  }

  function openPreview() {
    setOpen(true);
    if (typeof onZoomOpen === "function") {
      onZoomOpen();
    }
  }

  function resetZoom() {
    applyZoom(MIN_ZOOM, { x: 0, y: 0 });
  }

  function toggleZoom() {
    if (zoomRef.current > MIN_ZOOM + 0.05) {
      resetZoom();
      return;
    }
    applyZoom(2.4, { x: 0, y: 0 });
  }

  function handlePreviewPointerDown(event) {
    event.stopPropagation();
    if (event.button > 0) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    const pointer =
      { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, pointer);

    const pointers =
      Array.from(pointersRef.current.values());

    if (pointers.length === 1) {
      gestureRef.current = {
        ...gestureRef.current,
        dragStart: pointer,
        hasMoved: false,
        hasPinched: false,
        startPosition: positionRef.current,
        startZoom: zoomRef.current,
      };
    }

    if (pointers.length === 2) {
      gestureRef.current = {
        ...gestureRef.current,
        hasMoved: false,
        hasPinched: true,
        startCenter: centerBetween(pointers[0], pointers[1]),
        startDistance: Math.max(distanceBetween(pointers[0], pointers[1]), 1),
        startPosition: positionRef.current,
        startZoom: zoomRef.current,
      };
    }
  }

  function handlePreviewPointerMove(event) {
    if (!pointersRef.current.has(event.pointerId)) return;

    event.stopPropagation();
    const nextPointer =
      { x: event.clientX, y: event.clientY };
    const gesture =
      gestureRef.current;
    pointersRef.current.set(event.pointerId, nextPointer);

    if (distanceBetween(nextPointer, gesture.dragStart) > 8) {
      gesture.hasMoved = true;
    }

    const pointers =
      Array.from(pointersRef.current.values());

    if (pointers.length >= 2) {
      event.preventDefault();
      gesture.hasPinched = true;
      const nextDistance =
        Math.max(distanceBetween(pointers[0], pointers[1]), 1);
      const nextCenter =
        centerBetween(pointers[0], pointers[1]);
      const nextZoom =
        gesture.startZoom * (nextDistance / gesture.startDistance);
      const centerDelta = {
        x: nextCenter.x - gesture.startCenter.x,
        y: nextCenter.y - gesture.startCenter.y,
      };

      applyZoom(nextZoom, {
        x: gesture.startPosition.x + centerDelta.x,
        y: gesture.startPosition.y + centerDelta.y,
      });
      return;
    }

    if (pointers.length === 1 && zoomRef.current > MIN_ZOOM) {
      event.preventDefault();
      applyZoom(zoomRef.current, {
        x: gesture.startPosition.x + nextPointer.x - gesture.dragStart.x,
        y: gesture.startPosition.y + nextPointer.y - gesture.dragStart.y,
      });
    }
  }

  function handlePreviewPointerEnd(event) {
    event.stopPropagation();
    const pointersBeforeEnd =
      pointersRef.current.size;
    const gesture =
      gestureRef.current;
    const wasTap =
      pointersBeforeEnd === 1 &&
      !gesture.hasMoved &&
      !gesture.hasPinched;

    pointersRef.current.delete(event.pointerId);
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    const remainingPointers =
      Array.from(pointersRef.current.values());

    if (remainingPointers.length === 1) {
      gestureRef.current = {
        ...gestureRef.current,
        dragStart: remainingPointers[0],
        hasMoved: false,
        hasPinched: true,
        startPosition: positionRef.current,
        startZoom: zoomRef.current,
      };
    }

    if (!wasTap || event.pointerType !== "touch") return;

    const now =
      window.Date.now();
    if (now - lastTapRef.current <= DOUBLE_TAP_DELAY) {
      toggleZoom();
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current =
      now;
  }

  function handleWheel(event) {
    event.preventDefault();
    event.stopPropagation();

    const direction =
      event.deltaY > 0 ? -0.35 : 0.35;
    applyZoom(zoomRef.current + direction);
  }

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";
    pointersRef.current.clear();
    lastTapRef.current =
      0;
    zoomRef.current =
      MIN_ZOOM;
    positionRef.current =
      { x: 0, y: 0 };
    setZoom(MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, src]);

  if (!src) {
    return (
      <div className={`flex items-center justify-center text-zinc-400 ${className}`}>
        Sem imagem
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        className={`group/image relative block overflow-hidden text-left ${className}`}
        aria-label={zoomLabel}
      >
        <img
          src={src}
          alt={alt}
          className={imageClassName}
          draggable={false}
          loading="lazy"
          decoding="async"
          sizes={sizes}
        />
        <span className={`absolute bottom-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#873c50] shadow-sm transition ${zoomHintClass}`}>
          <ZoomIn size={18} />
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1f1117]/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Imagem ampliada do produto"}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
            className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#43232d] shadow-lg transition hover:bg-[#fff1f5]"
            aria-label="Fechar imagem ampliada"
          >
            <X size={20} />
          </button>

          <div
            ref={viewportRef}
            className={`relative flex h-full w-full items-center justify-center overflow-hidden ${zoom > MIN_ZOOM ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
            onClick={(event) => {
              if (event.target !== event.currentTarget) {
                event.stopPropagation();
              }
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              if (event.target === event.currentTarget) return;
              toggleZoom();
            }}
            onPointerCancel={handlePreviewPointerEnd}
            onPointerDown={handlePreviewPointerDown}
            onPointerMove={handlePreviewPointerMove}
            onPointerUp={handlePreviewPointerEnd}
            onWheel={handleWheel}
            style={{ touchAction: "none" }}
          >
            <img
              src={src}
              alt={alt}
              className="max-h-[88vh] max-w-[94vw] rounded-3xl bg-white object-contain shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
              draggable={false}
              style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom})`,
                transition: pointersRef.current.size ? "none" : "transform 160ms ease",
              }}
            />
          </div>

          <div
            className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 p-1.5 text-[#43232d] shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => applyZoom(zoomRef.current - 0.5)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#fff1f5] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Diminuir zoom"
              disabled={zoom <= MIN_ZOOM}
              title="Diminuir zoom"
            >
              <ZoomOut size={18} />
            </button>
            <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-[#43232d]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => applyZoom(zoomRef.current + 0.5)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#fff1f5] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Aumentar zoom"
              disabled={zoom >= MAX_ZOOM}
              title="Aumentar zoom"
            >
              <ZoomIn size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
