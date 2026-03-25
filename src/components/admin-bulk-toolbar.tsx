"use client";

import type { ReactNode } from "react";

export function AdminBulkToolbar({
  selectedCount,
  onToggleSelectAll,
  children,
  label,
}: {
  selectedCount: number;
  onToggleSelectAll: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
      <button
        type="button"
        onClick={onToggleSelectAll}
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
      >
        全选当前筛选结果
      </button>
      <span className="text-sm font-medium text-slate-900">
        {label ?? "已选"} {selectedCount} 项
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
