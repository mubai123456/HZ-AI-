"use client";

import { useState } from "react";

import { ImageLightbox } from "@/components/image-lightbox";
import { ResultsPanel } from "@/components/results-panel";
import type { TaskRecord } from "@/lib/types";

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxAssets, setLightboxAssets] = useState<Array<{ id: string; name: string; url: string }>>([]);

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

  const openLightbox = (assets: Array<{ id: string; name: string; url: string }>, index: number) => {
    setLightboxAssets(assets);
    setLightboxIndex(index);
  };

  return (
    <>
      <ResultsPanel
        task={task}
        onPoll={handlePoll}
        onOpenLightbox={openLightbox}
        onReuseTask={onReuseTask}
        canReuseTask={canReuseTask}
        leadingContent={leadingContent}
      />
      {lightboxIndex !== null && lightboxAssets.length > 0 ? (
        <ImageLightbox
          assets={lightboxAssets}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
