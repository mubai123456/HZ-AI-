"use client";

import { useState } from "react";

import type { TaskAssetRecord } from "@/lib/types";

type DownloadMode = "single" | "multiple" | "archive" | null;

interface TaskOutputDownloadActionsProps {
  taskId: string;
  assets: TaskAssetRecord[];
  currentAssetId?: string | null;
}

function parseFilenameFromDisposition(disposition: string | null, fallback: string) {
  if (!disposition) {
    return fallback;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = /filename="?([^"]+)"?/i.exec(disposition);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return fallback;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function TaskOutputDownloadActions({
  taskId,
  assets,
  currentAssetId,
}: TaskOutputDownloadActionsProps) {
  const [activeMode, setActiveMode] = useState<DownloadMode>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const currentAsset =
    assets.find((asset) => asset.id === currentAssetId) ?? assets[0] ?? null;

  async function downloadEndpoint(url: string, fallbackFilename: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("download_failed");
    }

    const blob = await response.blob();
    const filename = parseFilenameFromDisposition(
      response.headers.get("content-disposition"),
      fallbackFilename,
    );

    triggerBrowserDownload(blob, filename);
  }

  async function handleCurrentDownload() {
    if (!currentAsset) {
      return;
    }

    setActiveMode("single");
    setStatusMessage("正在下载当前图片");
    setErrorMessage("");

    try {
      await downloadEndpoint(
        `/api/internal/tasks/${taskId}/downloads/assets/${currentAsset.id}`,
        currentAsset.name,
      );
      setStatusMessage("");
    } catch {
      setErrorMessage("当前图片下载失败，请稍后重试。");
    } finally {
      setActiveMode(null);
    }
  }

  async function handleArchiveDownload() {
    setActiveMode("archive");
    setStatusMessage("正在生成 ZIP");
    setErrorMessage("");

    try {
      await downloadEndpoint(
        `/api/internal/tasks/${taskId}/downloads/archive`,
        `${taskId}-outputs.zip`,
      );
      setStatusMessage("");
    } catch {
      setErrorMessage("ZIP 下载失败，请稍后重试。");
    } finally {
      setActiveMode(null);
    }
  }

  async function handleMultipleDownload() {
    if (assets.length === 0) {
      return;
    }

    setActiveMode("multiple");
    setErrorMessage("");

    let failedCount = 0;
    for (let index = 0; index < assets.length; index += 1) {
      const asset = assets[index];
      setStatusMessage(`正在下载 ${index + 1}/${assets.length}`);

      try {
        await downloadEndpoint(
          `/api/internal/tasks/${taskId}/downloads/assets/${asset.id}`,
          asset.name,
        );
      } catch {
        failedCount += 1;
      }

      if (index < assets.length - 1) {
        await wait(180);
      }
    }

    setStatusMessage("");
    setActiveMode(null);

    if (failedCount > 0) {
      setErrorMessage(`有 ${failedCount} 张图片下载失败，建议改用 ZIP 下载。`);
    }
  }

  if (!currentAsset) {
    return null;
  }

  const isBusy = activeMode !== null;
  const hasMultiple = assets.length > 1;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleCurrentDownload()}
          disabled={isBusy}
          className="inline-flex items-center justify-center rounded-full bg-[#0066DD] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0055BB] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {activeMode === "single" ? "下载中..." : "下载当前图片"}
        </button>
        {hasMultiple ? (
          <button
            type="button"
            onClick={() => void handleMultipleDownload()}
            disabled={isBusy}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeMode === "multiple" ? "正在下载多张" : "直接下载多张"}
          </button>
        ) : null}
        {hasMultiple ? (
          <button
            type="button"
            onClick={() => void handleArchiveDownload()}
            disabled={isBusy}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeMode === "archive" ? "正在生成 ZIP" : "下载全部 ZIP"}
          </button>
        ) : null}
      </div>
      {statusMessage ? <p className="text-xs text-slate-500">{statusMessage}</p> : null}
      {errorMessage ? <p className="text-xs text-amber-600">{errorMessage}</p> : null}
    </div>
  );
}
