"use client";

import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { TaskOutputDownloadActions } from "@/components/task-output-download-actions";
import { getDisplayTaskId } from "@/lib/task-identity";
import { getTaskInputFieldLabel } from "@/lib/task-inputs";
import type { TaskAssetRecord, TaskRecord } from "@/lib/types";

function AssetPreviewGrid({
  siteTaskNo,
  assets,
  kind,
  onOpenLightbox,
  schemaLabels,
}: {
  siteTaskNo: string;
  assets: TaskAssetRecord[];
  kind: "input" | "output";
  onOpenLightbox: (assets: TaskAssetRecord[], initialIndex: number) => void;
  schemaLabels?: TaskRecord["appInputSchema"];
}) {
  if (assets.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
        {kind === "input" ? "暂无输入参考图" : "暂无输出结果"}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {assets.map((asset, index) => {
        const fieldLabel =
          kind === "input"
            ? getTaskInputFieldLabel(asset.sourceSlot ?? "", schemaLabels, index === 0 ? "主参考图" : `输入图 ${index + 1}`)
            : `结果图 ${index + 1}`;

        return (
          <button
            key={asset.id}
            type="button"
            onClick={() => onOpenLightbox(assets, index)}
            aria-label={`预览任务 ${siteTaskNo} ${kind === "input" ? "输入图" : "结果图"} ${index + 1}`}
            className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50 text-left transition hover:border-slate-300"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt={asset.name} className="aspect-square w-full object-cover" />
            <div className="space-y-1 border-t border-slate-100 bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {index === 0 && kind === "input" ? "主参考图" : fieldLabel}
              </p>
              <p className="truncate text-sm font-medium text-slate-700">{asset.name}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function TaskDetailDrawer({
  open,
  task,
  taskSummary,
  loading,
  errorMessage,
  onClose,
  onOpenLightbox,
}: {
  open: boolean;
  task: TaskRecord | null;
  taskSummary: TaskRecord | null;
  loading: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onOpenLightbox: (assets: TaskAssetRecord[], initialIndex: number) => void;
}) {
  if (!open) {
    return null;
  }

  const displayTask = task ?? taskSummary;
  const siteTaskNo = displayTask?.siteTaskNo ?? "任务详情";
  const promptLabel = getTaskInputFieldLabel("prompt", task?.appInputSchema, "主提示词");
  const imageFieldKeys = new Set(
    task?.appInputSchema?.filter((field) => field.type === "image").map((field) => field.key) ?? [],
  );
  const paramEntries = Object.entries(task?.params ?? {}).filter(([key, value]) => {
    if (!value) {
      return false;
    }

    if (key === "prompt") {
      return false;
    }

    return !imageFieldKeys.has(key);
  });

  const summaryItems = task
    ? [
        { label: "站内编号", value: task.siteTaskNo },
        { label: "任务 ID", value: getDisplayTaskId(task) },
        { label: "应用", value: task.appName },
        { label: "创建人", value: task.ownerName },
        { label: "创建时间", value: task.createdAt },
        { label: "来源状态", value: task.providerStatus },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[65] bg-slate-950/35 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`任务详情：${siteTaskNo}`}
        className="ml-auto flex h-full w-full max-w-[920px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-slate-500">任务详情</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">{siteTaskNo}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {displayTask ? `${displayTask.appName} · ${displayTask.ownerName}` : "正在读取任务详情"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {displayTask ? (
              <Link
                href={`/tasks/${displayTask.id}`}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                打开详情页
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              关闭
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
              正在加载任务详情...
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {task ? (
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">概览</p>
                    <p className="mt-1 text-sm text-slate-500">这里汇总当前任务的状态、来源和执行信息。</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={task.status} />
                    {task.syncStatus ? <StatusBadge value={task.syncStatus} /> : null}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {summaryItems.map((item) => (
                    <div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                      <p className="mt-2 break-all text-sm font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">输入信息</p>
                  <p className="mt-1 text-sm text-slate-500">这里按用户提交时的表单顺序展示参考图、主提示词和其它参数。</p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">输入参考图</p>
                  <AssetPreviewGrid
                    siteTaskNo={task.siteTaskNo}
                    assets={task.inputAssets}
                    kind="input"
                    onOpenLightbox={onOpenLightbox}
                    schemaLabels={task.appInputSchema}
                  />
                </div>

                {task.prompt ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{promptLabel}</p>
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                      {task.prompt}
                    </div>
                  </div>
                ) : null}

                {paramEntries.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">其它参数</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {paramEntries.map(([key, value]) => (
                        <div key={key} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            {getTaskInputFieldLabel(key, task.appInputSchema)}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">输出结果</p>
                    <p className="mt-1 text-sm text-slate-500">支持放大预览和下载当前任务的全部结果。</p>
                  </div>
                  {task.outputAssets.length > 0 ? (
                    <TaskOutputDownloadActions taskId={task.id} assets={task.outputAssets} />
                  ) : null}
                </div>

                <AssetPreviewGrid
                  siteTaskNo={task.siteTaskNo}
                  assets={task.outputAssets}
                  kind="output"
                  onOpenLightbox={onOpenLightbox}
                />
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">系统日志</p>
                    <p className="mt-1 text-sm text-slate-500">用于排查来源任务 ID、来源状态和异常信息。</p>
                  </div>
                  {task.systemLogs.length > 0 ? (
                    <div className="space-y-3">
                      {task.systemLogs.map((log) => (
                        <div
                          key={log}
                          className="rounded-[18px] bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100"
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                      暂无系统日志
                    </div>
                  )}
                </div>

                <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">飞书同步</p>
                    <p className="mt-1 text-sm text-slate-500">这里保留归档结果和最近的同步回执。</p>
                  </div>
                  {task.syncLogs.length > 0 ? (
                    <div className="space-y-3">
                      {task.syncLogs.map((log, index) => (
                        <div key={`${log.time}-${index}`} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">{log.time}</p>
                            <StatusBadge value={log.status} />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                      暂无同步记录
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
