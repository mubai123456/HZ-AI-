"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminBulkToolbar } from "@/components/admin-bulk-toolbar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageLightbox } from "@/components/image-lightbox";
import { StatusBadge } from "@/components/status-badge";
import { TaskDetailDrawer } from "@/components/task-detail-drawer";
import { useListSelection } from "@/components/use-list-selection";
import { getDisplayTaskId } from "@/lib/task-identity";
import type { BulkOperationResult, TaskAssetRecord, TaskBulkAction, TaskRecord } from "@/lib/types";

type LightboxState = {
  assets: Array<{ id: string; name: string; url: string }>;
  initialIndex: number;
};

async function readResponseJson(response: Response) {
  return response.json().catch(() => ({}));
}

function toLightboxAssets(assets: TaskAssetRecord[]) {
  return assets
    .filter((asset) => asset.url)
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      url: asset.url,
    }));
}

function PreviewCell({
  asset,
  emptyLabel,
  buttonLabel,
  onOpen,
}: {
  asset?: TaskAssetRecord;
  emptyLabel: string;
  buttonLabel: string;
  onOpen: () => void;
}) {
  if (!asset) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-dashed border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={buttonLabel}
      className="group flex h-14 w-14 items-center justify-center overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50 transition hover:border-slate-300"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.url}
        alt={asset.name}
        className="h-full w-full object-cover transition group-hover:scale-105"
      />
    </button>
  );
}

export function AdminTasksClient({ initialTasks }: { initialTasks: TaskRecord[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<TaskBulkAction["type"] | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [lightboxState, setLightboxState] = useState<LightboxState | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<TaskRecord | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, TaskRecord>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);

  const selection = useListSelection(tasks);
  const allSelected = tasks.length > 0 && tasks.every((task) => selection.selectedIdSet.has(task.id));
  const detailSummary = useMemo(
    () => tasks.find((task) => task.id === detailTaskId) ?? null,
    [detailTaskId, tasks],
  );

  function openLightbox(assets: TaskAssetRecord[], initialIndex: number) {
    const nextAssets = toLightboxAssets(assets);
    if (nextAssets.length === 0) {
      return;
    }

    setLightboxState({
      assets: nextAssets,
      initialIndex: Math.min(initialIndex, nextAssets.length - 1),
    });
  }

  function closeTaskDetail() {
    setDetailTaskId(null);
    setDetailTask(null);
    setDetailLoading(false);
    setDetailErrorMessage(null);
  }

  async function openTaskDetail(task: TaskRecord) {
    setDetailTaskId(task.id);
    setDetailErrorMessage(null);

    const cachedTask = detailCache[task.id];
    if (cachedTask) {
      setDetailTask(cachedTask);
      setDetailLoading(false);
      return;
    }

    setDetailTask(null);
    setDetailLoading(true);

    try {
      const response = await fetch(`/api/internal/tasks/${task.id}`, { cache: "no-store" });
      const data = (await readResponseJson(response)) as TaskRecord & { error?: string };

      if (!response.ok) {
        setDetailErrorMessage(data.error ?? "任务详情加载失败");
        return;
      }

      setDetailTask(data);
      setDetailCache((current) => ({
        ...current,
        [task.id]: data,
      }));
    } catch {
      setDetailErrorMessage("任务详情加载失败");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleBulkAction(action: TaskBulkAction) {
    if (selection.selectedIds.length === 0) {
      setMessage("请先勾选要处理的任务。");
      return;
    }

    setPendingAction(action.type);
    setMessage(null);

    try {
      const response = await fetch("/api/internal/admin/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selection.selectedIds, action }),
      });
      const data = (await readResponseJson(response)) as BulkOperationResult & { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "批量任务操作失败。");
        return;
      }

      if (action.type === "delete") {
        const deletedIdSet = new Set(selection.selectedIds);

        setTasks((current) => current.filter((task) => !deletedIdSet.has(task.id)));
        setDetailCache((current) => {
          const next = { ...current };
          selection.selectedIds.forEach((id) => {
            delete next[id];
          });
          return next;
        });

        if (detailTaskId && deletedIdSet.has(detailTaskId)) {
          closeTaskDetail();
        }

        setBulkDeleteOpen(false);
      } else {
        const successIds = new Set(
          data.results.filter((item) => item.status === "success").map((item) => item.id),
        );

        setTasks((current) =>
          current.map((task) =>
            successIds.has(task.id)
              ? {
                  ...task,
                  syncStatus: "SUCCESS",
                  syncErrorMessage: undefined,
                }
              : task,
          ),
        );
        router.refresh();
      }

      selection.clearSelection();
      setMessage(
        `批量操作完成：成功 ${data.summary.successCount} 条，跳过 ${data.summary.skippedCount} 条，失败 ${data.summary.failureCount} 条。`,
      );
    } catch {
      setMessage("批量任务操作失败。");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {message}
        </div>
      ) : null}

      <AdminBulkToolbar
        selectedCount={selection.selectedCount}
        label="已选任务"
        onToggleSelectAll={() => selection.toggleSelectAll(tasks)}
      >
        <button
          type="button"
          onClick={() => void handleBulkAction({ type: "retrySync" })}
          disabled={selection.selectedCount === 0 || pendingAction !== null}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          批量重试同步
        </button>
        <button
          type="button"
          onClick={() => setBulkDeleteOpen(true)}
          disabled={selection.selectedCount === 0 || pendingAction !== null}
          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-50"
        >
          批量删除
        </button>
      </AdminBulkToolbar>

      <div className="soft-scroll overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-3 pr-4 font-medium">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => selection.toggleSelectAll(tasks)}
                  aria-label="全选当前任务"
                />
              </th>
              <th className="pb-3 font-medium">输入参考图</th>
              <th className="pb-3 font-medium">结果预览</th>
              <th className="pb-3 font-medium">站内编号</th>
              <th className="pb-3 font-medium">应用</th>
              <th className="pb-3 font-medium">创建人</th>
              <th className="pb-3 font-medium">状态</th>
              <th className="pb-3 font-medium">来源</th>
              <th className="pb-3 font-medium">同步</th>
              <th className="pb-3 font-medium">创建时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400">
                  暂无任务，先去应用页提交一个吧。
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const inputPreview = task.inputAssets[0];
                const resultPreview = task.outputAssets[0];

                return (
                  <tr key={task.id} className="hover:bg-slate-50/50">
                    <td className="py-4 pr-4">
                      <input
                        type="checkbox"
                        checked={selection.selectedIdSet.has(task.id)}
                        onChange={() => selection.toggleSelected(task.id)}
                        aria-label={`勾选任务 ${task.siteTaskNo}`}
                      />
                    </td>
                    <td className="py-4">
                      <PreviewCell
                        asset={inputPreview}
                        emptyLabel="暂无"
                        buttonLabel={`预览任务 ${task.siteTaskNo} 输入参考图`}
                        onOpen={() => openLightbox(task.inputAssets, 0)}
                      />
                    </td>
                    <td className="py-4">
                      <PreviewCell
                        asset={resultPreview}
                        emptyLabel="暂无"
                        buttonLabel={`预览任务 ${task.siteTaskNo} 结果`}
                        onOpen={() => openLightbox(task.outputAssets, 0)}
                      />
                    </td>
                    <td className="py-4 font-semibold text-slate-950">
                      <button
                        type="button"
                        onClick={() => void openTaskDetail(task)}
                        aria-label={`打开任务 ${task.siteTaskNo} 详情`}
                        className="text-left transition hover:text-sky-600"
                      >
                        {task.siteTaskNo}
                      </button>
                      <p className="mt-1 break-all text-xs font-normal text-slate-500">
                        任务ID：{getDisplayTaskId(task)}
                      </p>
                    </td>
                    <td className="py-4 text-slate-600">
                      <button
                        type="button"
                        onClick={() => void openTaskDetail(task)}
                        className="text-left transition hover:text-sky-600"
                      >
                        {task.appName}
                      </button>
                    </td>
                    <td className="py-4 text-slate-600">{task.ownerName}</td>
                    <td className="py-4">
                      <StatusBadge value={task.status} />
                    </td>
                    <td className="py-4">
                      <StatusBadge value={task.providerStatus} />
                    </td>
                    <td className="py-4">
                      {task.syncStatus ? <StatusBadge value={task.syncStatus} /> : "--"}
                    </td>
                    <td className="py-4 text-slate-500">{task.createdAt}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="确认批量删除任务"
        description={`确定要彻底删除当前选中的 ${selection.selectedCount} 条任务吗？会联动删除任务素材和同步日志。`}
        confirmLabel="确认删除"
        confirmTone="danger"
        pending={pendingAction === "delete"}
        onClose={() => {
          if (pendingAction !== "delete") {
            setBulkDeleteOpen(false);
          }
        }}
        onConfirm={() => void handleBulkAction({ type: "delete" })}
      />

      <TaskDetailDrawer
        open={detailTaskId !== null}
        task={detailTask}
        taskSummary={detailSummary}
        loading={detailLoading}
        errorMessage={detailErrorMessage}
        onClose={closeTaskDetail}
        onOpenLightbox={openLightbox}
      />

      {lightboxState ? (
        <ImageLightbox
          assets={lightboxState.assets}
          initialIndex={lightboxState.initialIndex}
          onClose={() => setLightboxState(null)}
        />
      ) : null}
    </div>
  );
}
