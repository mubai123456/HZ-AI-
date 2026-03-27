"use client";

import { useState } from "react";

import { ImageLightbox } from "@/components/image-lightbox";
import { ResultsPanel } from "@/components/results-panel";
import type { ImageMirrorMode, TaskRecord } from "@/lib/types";

interface Props {
  task: TaskRecord | null;
  onRefreshTasks?: () => void;
  onReuseTask?: (task: TaskRecord) => void;
  canReuseTask?: boolean;
  leadingContent?: React.ReactNode;
}

export function ResultsPanelClient({
  task,
  onRefreshTasks,
  onReuseTask,
  canReuseTask = true,
  leadingContent,
}: Props) {
  return (
    <ResultsPanelClientContent
      key={task?.id ?? "empty-task"}
      task={task}
      onRefreshTasks={onRefreshTasks}
      onReuseTask={onReuseTask}
      canReuseTask={canReuseTask}
      leadingContent={leadingContent}
    />
  );
}

function ResultsPanelClientContent({
  task,
  onRefreshTasks,
  onReuseTask,
  canReuseTask = true,
  leadingContent,
}: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxAssets, setLightboxAssets] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [lightboxMirrorEnabled, setLightboxMirrorEnabled] = useState(false);
  const [mirrorMode, setMirrorMode] = useState<ImageMirrorMode>("none");

  const handlePoll = async () => {
    if (!task?.id) {
      return;
    }

    try {
      const res = await fetch(`/api/internal/tasks/${task.id}/poll`);
      if (res.ok) {
        onRefreshTasks?.();
      }
    } catch {
      // silently fail
    }
  };

  const openLightbox = (
    assets: Array<{ id: string; name: string; url: string }>,
    index: number,
    options?: { enableMirrorControls?: boolean },
  ) => {
    setLightboxAssets(assets);
    setLightboxIndex(index);
    setLightboxMirrorEnabled(Boolean(options?.enableMirrorControls));
  };

  return (
    <>
      <ResultsPanel
        task={task}
        onPoll={handlePoll}
        onOpenLightbox={openLightbox}
        onReuseTask={onReuseTask}
        mirrorMode={mirrorMode}
        onMirrorModeChange={setMirrorMode}
        canReuseTask={canReuseTask}
        leadingContent={leadingContent}
      />
      {lightboxIndex !== null && lightboxAssets.length > 0 ? (
        <ImageLightbox
          assets={lightboxAssets}
          initialIndex={lightboxIndex}
          initialMirrorMode={lightboxMirrorEnabled ? mirrorMode : "none"}
          enableMirrorControls={lightboxMirrorEnabled}
          buildDownloadUrl={
            lightboxMirrorEnabled && task
              ? (asset) => `/api/internal/tasks/${task.id}/downloads/assets/${asset.id}`
              : undefined
          }
          onMirrorModeChange={lightboxMirrorEnabled ? setMirrorMode : undefined}
          onClose={() => {
            setLightboxIndex(null);
            setLightboxMirrorEnabled(false);
            setMirrorMode("none");
          }}
        />
      ) : null}
    </>
  );
}
