"use client";

import { useCallback, useEffect, useState } from "react";

import { AssetThumbnail } from "@/components/asset-thumbnail";
import { StatusBadge } from "@/components/status-badge";
import { TaskOutputDownloadActions } from "@/components/task-output-download-actions";
import { getDisplayTaskId } from "@/lib/task-identity";
import { getTaskElapsedLabel } from "@/lib/task-time";
import type { ImageMirrorMode, TaskRecord } from "@/lib/types";

interface ResultsPanelProps {
  task: TaskRecord | null;
  onPoll?: () => void;
  onOpenLightbox?: (
    assets: Array<{ id: string; name: string; url: string }>,
    index: number,
    options?: { enableMirrorControls?: boolean },
  ) => void;
  onReuseTask?: (task: TaskRecord) => void;
  onMirrorModeChange?: (mode: ImageMirrorMode) => void;
  mirrorMode?: ImageMirrorMode;
  canReuseTask?: boolean;
  leadingContent?: React.ReactNode;
}

export function ResultsPanel({
  task,
  onPoll,
  onOpenLightbox,
  onReuseTask,
  onMirrorModeChange,
  mirrorMode = "none",
  canReuseTask = true,
  leadingContent,
}: ResultsPanelProps) {
  return (
    <ResultsPanelContent
      key={task?.id ?? "empty-task"}
      task={task}
      onPoll={onPoll}
      onOpenLightbox={onOpenLightbox}
      onReuseTask={onReuseTask}
      onMirrorModeChange={onMirrorModeChange}
      mirrorMode={mirrorMode}
      canReuseTask={canReuseTask}
      leadingContent={leadingContent}
    />
  );
}

function ResultsPanelContent({
  task,
  onPoll,
  onOpenLightbox,
  onReuseTask,
  onMirrorModeChange,
  mirrorMode = "none",
  canReuseTask = true,
  leadingContent,
}: ResultsPanelProps) {
  const [isPolling, setIsPolling] = useState(false);
  const [activeOutputIndex, setActiveOutputIndex] = useState(0);
  const [copiedTaskId, setCopiedTaskId] = useState(false);
  const [activeTab, setActiveTab] = useState<"result" | "case">("result");
  const [showInputs, setShowInputs] = useState(false);

  const hasCaseTab = Boolean(leadingContent);
  const visibleTab = hasCaseTab ? activeTab : "result";

  useEffect(() => {
    if (!task || (task.status !== "RUNNING" && task.status !== "QUEUED")) {
      return;
    }

    const interval = window.setInterval(() => {
      onPoll?.();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [onPoll, task]);

  const outputAssets = task?.outputAssets ?? [];
  const inputAssets = task?.inputAssets ?? [];
  const hasMultipleOutputs = outputAssets.length > 1;
  const currentOutputIndex = activeOutputIndex < outputAssets.length ? activeOutputIndex : 0;
  const primaryOutput = outputAssets[currentOutputIndex] ?? outputAssets[0] ?? null;
  const isActive = task?.status === "RUNNING" || task?.status === "QUEUED";
  const elapsedLabel = task ? getTaskElapsedLabel(task) : null;
  const displayTaskId = task ? getDisplayTaskId(task) : "";
  const promptLines = [
    task?.promptTemplateName
      ? { label: "已选模板", value: task.promptTemplateName }
      : null,
    task?.prompt ? { label: "本次提示词", value: task.prompt } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item?.value));
  const paramEntries = Object.entries(task?.params ?? {}).filter(([key, value]) => {
    if (!value || key === "prompt") {
      return false;
    }

    return !inputAssets.some((asset) => asset.sourceSlot === key) && !key.startsWith("image");
  });
  const hasInputSection = inputAssets.length > 0 || paramEntries.length > 0;

  const changeOutputIndex = useCallback((direction: -1 | 1) => {
    if (!hasMultipleOutputs) {
      return;
    }

    setActiveOutputIndex((current) => {
      const nextIndex = (current + direction + outputAssets.length) % outputAssets.length;
      return nextIndex;
    });
    onMirrorModeChange?.("none");
  }, [hasMultipleOutputs, onMirrorModeChange, outputAssets.length]);

  useEffect(() => {
    if (!task || (task.outputAssets?.length ?? 0) <= 1) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        changeOutputIndex(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        changeOutputIndex(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeOutputIndex, task]);

  const handlePoll = () => {
    setIsPolling(true);
    onPoll?.();
    window.setTimeout(() => setIsPolling(false), 1000);
  };

  const handleCopyTaskId = async () => {
    if (!displayTaskId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(displayTaskId);
      setCopiedTaskId(true);
      window.setTimeout(() => setCopiedTaskId(false), 1500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = displayTaskId;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedTaskId(true);
      window.setTimeout(() => setCopiedTaskId(false), 1500);
    }
  };

  const handleToggleMirror = (nextMode: Exclude<ImageMirrorMode, "none">) => {
    onMirrorModeChange?.(mirrorMode === nextMode ? "none" : nextMode);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {task ? <StatusBadge value={task.status} /> : null}
            {elapsedLabel ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {elapsedLabel}
              </span>
            ) : null}
            {task?.queuePosition != null && isActive ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                队列位置 {task.queuePosition}
              </span>
            ) : null}
            {task ? (
              <>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {task.siteTaskNo}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  任务 ID：{displayTaskId}
                </span>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasCaseTab ? (
              <div
                role="tablist"
                aria-label="结果区标签"
                className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={visibleTab === "result"}
                  onClick={() => setActiveTab("result")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    visibleTab === "result" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  结果
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={visibleTab === "case"}
                  onClick={() => setActiveTab("case")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    visibleTab === "case" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  案例
                </button>
              </div>
            ) : null}
            {isActive ? (
              <button
                type="button"
                onClick={handlePoll}
                disabled={isPolling}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshIcon spinning={isPolling} />
                {isPolling ? "刷新中..." : "刷新"}
              </button>
            ) : null}
            {task ? (
              <button
                type="button"
                onClick={() => onReuseTask?.(task)}
                disabled={!canReuseTask}
                className="rounded-full bg-[#0066DD] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0055BB] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {canReuseTask ? "一键同款" : "仅支持当前应用同款"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {visibleTab === "case" && leadingContent ? (
          <div>{leadingContent}</div>
        ) : (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
              <div className="flex min-h-[420px] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(241,245,249,0.95))] p-5">
                {primaryOutput ? (
                  <div className="relative flex h-full w-full items-center justify-center">
                    {hasMultipleOutputs ? (
                      <button
                        type="button"
                        onClick={() => changeOutputIndex(-1)}
                        className="absolute left-0 z-10 rounded-full bg-slate-950/72 p-3 text-white transition hover:bg-slate-950"
                        aria-label="上一张结果"
                      >
                        <ArrowLeftIcon />
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() =>
                        onOpenLightbox?.(outputAssets, currentOutputIndex, {
                          enableMirrorControls: true,
                        })
                      }
                      aria-label={
                        hasMultipleOutputs
                          ? `查看当前图片 ${currentOutputIndex + 1}，共 ${outputAssets.length} 张`
                          : "查看当前图片"
                      }
                      className="group relative flex h-full w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      {hasMultipleOutputs ? (
                        <div className="absolute right-4 top-4 z-10 rounded-full bg-slate-950/72 px-3 py-1.5 text-xs font-semibold text-white">
                          {currentOutputIndex + 1} / {outputAssets.length}
                        </div>
                      ) : null}
                      <img
                        src={primaryOutput.url}
                        alt={primaryOutput.name}
                        className="max-h-[520px] w-full object-contain transition duration-300 group-hover:scale-[1.01]"
                        style={{
                          transform:
                            mirrorMode === "horizontal"
                              ? "scaleX(-1)"
                              : mirrorMode === "vertical"
                                ? "scaleY(-1)"
                                : undefined,
                        }}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </button>

                    {hasMultipleOutputs ? (
                      <button
                        type="button"
                        onClick={() => changeOutputIndex(1)}
                        className="absolute right-0 z-10 rounded-full bg-slate-950/72 p-3 text-white transition hover:bg-slate-950"
                        aria-label="下一张结果"
                      >
                        <ArrowRightIcon />
                      </button>
                    ) : null}
                  </div>
                ) : task?.status === "FAILED" ? (
                  <div className="max-w-md text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl text-rose-600">
                      !
                    </div>
                    <p className="mt-4 text-lg font-semibold text-rose-700">任务失败</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {task.providerErrorMessage ?? "服务端没有返回明确信息，请刷新状态后再试。"}
                    </p>
                  </div>
                ) : isActive ? (
                  <div className="max-w-md text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
                    <p className="mt-4 text-lg font-semibold text-slate-900">任务处理中</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      结果仍在生成中，状态会自动更新，你也可以手动刷新。
                    </p>
                  </div>
                ) : (
                  <div className="max-w-md text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl text-slate-500">
                      □
                    </div>
                    <p className="mt-4 text-lg font-semibold text-slate-900">等待结果返回</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {task ? "任务已经提交成功，结果会优先展示在这里。" : "先提交任务，这里会直接显示最新结果。"}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {task ? (
              <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  {primaryOutput ? (
                    <>
                      <TaskOutputDownloadActions
                        taskId={task.id}
                        assets={outputAssets}
                        currentAssetId={primaryOutput.id}
                        mirrorMode={mirrorMode}
                      />
                      <button
                        type="button"
                        onClick={() => handleToggleMirror("horizontal")}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          mirrorMode === "horizontal"
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-950"
                        }`}
                      >
                        左右镜像
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleMirror("vertical")}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          mirrorMode === "vertical"
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-950"
                        }`}
                      >
                        上下镜像
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenLightbox?.(outputAssets, currentOutputIndex, {
                            enableMirrorControls: true,
                          })
                        }
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                      >
                        放大查看
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleCopyTaskId()}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    {copiedTaskId ? "已复制任务 ID" : "复制任务 ID"}
                  </button>
                </div>
              </section>
            ) : null}

            {promptLines.length > 0 ? (
              <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">提示词来源</p>
                <div className="mt-3 space-y-3">
                  {promptLines.map((item) => (
                    <div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {task && hasInputSection ? (
              <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                <button
                  type="button"
                  onClick={() => setShowInputs((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">本次输入</p>
                    <p className="mt-1 text-sm text-slate-500">参考图和参数收在这里，需要时再展开查看。</p>
                  </div>
                  <span className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                    {showInputs ? "收起" : "展开"}
                  </span>
                </button>

                {showInputs ? (
                  <div className="mt-4 space-y-4">
                    {inputAssets.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">参考图</p>
                        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                          {inputAssets.map((asset, index) => (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() => onOpenLightbox?.(inputAssets, index)}
                              className="w-20 shrink-0 overflow-hidden rounded-[20px] border border-slate-200 p-1 transition hover:border-slate-300"
                              title={asset.name || `参考图 ${index + 1}`}
                            >
                              <AssetThumbnail asset={asset} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {paramEntries.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">其它参数</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {paramEntries.map(([key, value]) => (
                            <span
                              key={key}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                            >
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
