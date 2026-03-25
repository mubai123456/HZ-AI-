"use client";

import { useMemo } from "react";

import { getDisplayTaskId } from "@/lib/task-identity";
import { getTaskElapsedLabel } from "@/lib/task-time";
import type { TaskRecord } from "@/lib/types";

interface RecentResultsPanelProps {
  tasks: TaskRecord[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

function getStatusText(status: string): string {
  switch (status) {
    case "SUCCEEDED":
      return "成功";
    case "FAILED":
      return "失败";
    case "RUNNING":
      return "生成中";
    case "QUEUED":
      return "排队中";
    default:
      return "未知";
  }
}

function getStatusClasses(status: string): string {
  switch (status) {
    case "SUCCEEDED":
      return "text-emerald-600";
    case "FAILED":
      return "text-rose-600";
    case "RUNNING":
      return "text-sky-600";
    case "QUEUED":
      return "text-amber-600";
    default:
      return "text-slate-500";
  }
}

function formatTaskTime(task: TaskRecord): string {
  const createdAtMs = Date.parse(task.createdAtIso);
  if (Number.isNaN(createdAtMs)) {
    return task.createdAt;
  }

  return new Date(createdAtMs).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortTasksByNewest(tasks: TaskRecord[]) {
  return [...tasks].sort((a, b) => Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso));
}

export function RecentResultsPanel({ tasks, selectedTaskId, onSelectTask }: RecentResultsPanelProps) {
  const sortedTasks = useMemo(() => sortTasksByNewest(tasks), [tasks]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">全站任务</p>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
            {sortedTasks.length} 条
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {sortedTasks.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-600">暂无任务</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">提交任务后，这里会自动显示你的任务列表。</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-[20px] border border-slate-200 bg-white">
            {sortedTasks.map((task) => {
              const isSelected = task.id === selectedTaskId;
              const resultPreview = task.outputAssets[0];
              const elapsedLabel = getTaskElapsedLabel(task) ?? "等待耗时";

              return (
                <article
                  key={task.id}
                  data-testid="task-history-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectTask(task.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectTask(task.id);
                    }
                  }}
                  className={`relative flex cursor-pointer gap-3 px-3 py-2.5 text-left transition ${
                    isSelected ? "bg-sky-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${
                      isSelected ? "bg-sky-500" : "bg-transparent"
                    }`}
                  />

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-slate-100">
                    {resultPreview?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resultPreview.url} alt={resultPreview.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">图</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5 text-[11px] leading-4 text-slate-500">
                    <div className="flex items-center gap-2 text-slate-900">
                      <span className="truncate font-semibold">{task.siteTaskNo}</span>
                      <span className={`shrink-0 font-semibold ${getStatusClasses(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                      <span className="shrink-0 text-slate-400">{elapsedLabel}</span>
                    </div>
                    <p className="truncate font-medium text-slate-700">{task.appName}</p>
                    <p className="truncate">{formatTaskTime(task)}</p>
                    <p className="break-all">任务ID：{getDisplayTaskId(task)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
