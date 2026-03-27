"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  downloadAssetFromEndpoint,
  downloadMirroredAssetFromEndpoint,
} from "@/lib/client-image-download";
import type { ImageMirrorMode } from "@/lib/types";

interface LightboxAsset {
  id: string;
  name: string;
  url: string;
}

interface ImageLightboxProps {
  assets: LightboxAsset[];
  initialIndex?: number;
  initialMirrorMode?: ImageMirrorMode;
  enableMirrorControls?: boolean;
  buildDownloadUrl?: (asset: LightboxAsset) => string;
  onMirrorModeChange?: (mode: ImageMirrorMode) => void;
  onClose: () => void;
}

export function ImageLightbox({
  assets,
  initialIndex = 0,
  initialMirrorMode = "none",
  enableMirrorControls = false,
  buildDownloadUrl,
  onMirrorModeChange,
  onClose,
}: ImageLightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [mirrorMode, setMirrorMode] = useState<ImageMirrorMode>(initialMirrorMode);
  const [downloading, setDownloading] = useState(false);

  const currentAsset = assets[current] ?? null;
  const canDownload = Boolean(currentAsset && buildDownloadUrl);

  const updateMirrorMode = useCallback(
    (nextMode: ImageMirrorMode) => {
      setMirrorMode(nextMode);
      onMirrorModeChange?.(nextMode);
    },
    [onMirrorModeChange],
  );

  const resetTransform = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const resetImageState = useCallback(() => {
    updateMirrorMode("none");
    resetTransform();
  }, [resetTransform, updateMirrorMode]);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + assets.length) % assets.length);
    resetImageState();
  }, [assets.length, resetImageState]);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % assets.length);
    resetImageState();
  }, [assets.length, resetImageState]);

  useEffect(() => {
    setCurrent(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    updateMirrorMode(initialMirrorMode);
  }, [initialMirrorMode, updateMirrorMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "ArrowLeft") {
        prev();
      }
      if (e.key === "ArrowRight") {
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.min(Math.max(0.5, s + delta), 4));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTranslate({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) {
      return;
    }

    const deltaX = e.changedTouches[0].clientX - touchStart.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30) {
      if (deltaX > 0) {
        prev();
      } else {
        next();
      }
    }
    setTouchStart(null);
  };

  const imageTransform = useMemo(() => {
    const mirrorScaleX = mirrorMode === "horizontal" ? -1 : 1;
    const mirrorScaleY = mirrorMode === "vertical" ? -1 : 1;

    return `scale(${scale * mirrorScaleX}, ${scale * mirrorScaleY}) translate(${translate.x / scale}px, ${translate.y / scale}px)`;
  }, [mirrorMode, scale, translate.x, translate.y]);

  const handleDownload = useCallback(async () => {
    if (!currentAsset || !buildDownloadUrl) {
      return;
    }

    setDownloading(true);
    try {
      const downloadUrl = buildDownloadUrl(currentAsset);
      if (mirrorMode === "none") {
        await downloadAssetFromEndpoint(downloadUrl, currentAsset.name);
      } else {
        await downloadMirroredAssetFromEndpoint({
          url: downloadUrl,
          fallbackFilename: currentAsset.name,
          mirrorMode,
        });
      }
    } finally {
      setDownloading(false);
    }
  }, [buildDownloadUrl, currentAsset, mirrorMode]);

  const toggleMirrorMode = useCallback(
    (nextMode: Exclude<ImageMirrorMode, "none">) => {
      updateMirrorMode(mirrorMode === nextMode ? "none" : nextMode);
    },
    [mirrorMode, updateMirrorMode],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/55 px-2 py-2 backdrop-blur-sm">
        {enableMirrorControls ? (
          <>
            <ToolbarButton
              active={mirrorMode === "horizontal"}
              label="左右镜像"
              onClick={() => toggleMirrorMode("horizontal")}
            >
              <HorizontalMirrorIcon />
            </ToolbarButton>
            <ToolbarButton
              active={mirrorMode === "vertical"}
              label="上下镜像"
              onClick={() => toggleMirrorMode("vertical")}
            >
              <VerticalMirrorIcon />
            </ToolbarButton>
          </>
        ) : null}
        {canDownload ? (
          <ToolbarButton label={downloading ? "下载中" : "下载当前图"} onClick={() => void handleDownload()}>
            <DownloadIcon />
          </ToolbarButton>
        ) : null}
        <ToolbarButton label="重置" onClick={resetImageState}>
          <ResetIcon />
        </ToolbarButton>
        <ToolbarButton label="关闭" onClick={onClose}>
          <CloseIcon />
        </ToolbarButton>
      </div>

      {assets.length > 1 ? (
        <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
          {current + 1} / {assets.length}
        </span>
      ) : null}

      {assets.length > 1 ? (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      ) : null}

      <div
        className="relative max-h-full max-w-full"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        {currentAsset ? (
          <img
            key={currentAsset.id}
            src={currentAsset.url}
            alt={currentAsset.name}
            className="max-h-[80vh] max-w-[90vw] object-contain transition-transform duration-100"
            style={{ transform: imageTransform }}
          />
        ) : null}
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-4 py-2 backdrop-blur-sm">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => Math.min(4, s + 0.5));
          }}
          className="rounded-full p-1 text-white transition hover:bg-white/20"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <span className="min-w-[3rem] text-center text-sm text-white">{Math.round(scale * 100)}%</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => Math.max(0.5, s - 0.5));
          }}
          className="rounded-full p-1 text-white transition hover:bg-white/20"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({
  active = false,
  label,
  children,
  onClick,
}: {
  active?: boolean;
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`rounded-full p-2 text-white transition ${active ? "bg-white/25" : "hover:bg-white/15"}`}
    >
      {children}
    </button>
  );
}

function HorizontalMirrorIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 5v14M17 5v14M7 12h10" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8h4v8H3m14-8h4v8h-4" />
    </svg>
  );
}

function VerticalMirrorIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 7h14M5 17h14M12 7v10" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 3h8v4H8m0 10h8v4H8" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v10m0 0 4-4m-4 4-4-4M5 18h14" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
