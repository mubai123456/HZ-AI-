import type { SyncStatus, TaskStatus } from "@/lib/types";

const styleMap: Record<string, { class: string; label: string }> = {
  QUEUED: { class: "badge-warning", label: "排队中" },
  RUNNING: { class: "badge-info badge-pulse", label: "运行中" },
  SUCCEEDED: { class: "badge-success", label: "已成功" },
  SUCCESS: { class: "badge-success", label: "成功" },
  FAILED: { class: "badge-error", label: "失败" },
  PENDING: { class: "badge-neutral", label: "待处理" },
};

export function StatusBadge({ value }: { value: string }) {
  const style = styleMap[value] ?? { class: "badge-neutral", label: value };

  return (
    <span className={`badge ${style.class}`}>
      <span className="badge-dot" />
      {style.label}
    </span>
  );
}
