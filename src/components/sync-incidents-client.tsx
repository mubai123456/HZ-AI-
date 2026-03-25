"use client";

import { useState } from "react";

interface Incident {
  taskId: string;
  siteTaskNo: string;
  displayTaskId: string;
  message: string;
}

interface Props {
  incidents: Incident[];
}

export function SyncIncidentsClient({ incidents }: Props) {
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, { ok: boolean; error?: string }>>({});

  const handleRetry = async (taskId: string) => {
    setRetryingIds((prev) => new Set(prev).add(taskId));
    setResults((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });

    try {
      const res = await fetch("/api/internal/sync/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      setResults((prev) => ({ ...prev, [taskId]: data }));

      if (data.ok) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [taskId]: { ok: false, error: err instanceof Error ? err.message : "重试失败" },
      }));
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-3">
      {incidents.map((incident) => {
        const isRetrying = retryingIds.has(incident.taskId);
        const result = results[incident.taskId];

        return (
          <div
            key={incident.taskId}
            className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800" title={incident.siteTaskNo}>
                {incident.siteTaskNo}
              </p>
              <p className="mt-1 break-all text-xs text-slate-500">任务ID：{incident.displayTaskId}</p>
              <p className="mt-1 text-sm text-slate-600">{incident.message}</p>
              {result && !result.ok ? <p className="mt-1 text-xs text-rose-600">{result.error}</p> : null}
              {result && result.ok ? <p className="mt-1 text-xs text-emerald-600">重试成功，页面即将刷新。</p> : null}
            </div>
            <button
              onClick={() => handleRetry(incident.taskId)}
              disabled={isRetrying}
              className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {isRetrying ? "重试中..." : "重试同步"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
