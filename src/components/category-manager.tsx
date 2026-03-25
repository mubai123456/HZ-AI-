"use client";

import { useMemo, useState } from "react";

import { AdminBulkToolbar } from "@/components/admin-bulk-toolbar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useListSelection } from "@/components/use-list-selection";
import type { AppCategoryBulkAction, BulkOperationResult } from "@/lib/types";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
  appCount: number;
};

type SortField = "sortOrder" | "name" | "appCount";
type SortDirection = "asc" | "desc";

async function readResponseJson(response: Response) {
  return response.json().catch(() => ({}));
}

function sortCategories(items: Category[], field: SortField, direction: SortDirection) {
  const factor = direction === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    if (field === "name") {
      return left.name.localeCompare(right.name, "zh-CN") * factor;
    }

    if (field === "appCount") {
      return (left.appCount - right.appCount) * factor;
    }

    return (left.sortOrder - right.sortOrder) * factor;
  });
}

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [sortOrderDialogOpen, setSortOrderDialogOpen] = useState(false);
  const [bulkSortOrderInput, setBulkSortOrderInput] = useState("0");
  const [sortField, setSortField] = useState<SortField>("sortOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [form, setForm] = useState({ name: "", sortOrder: 0, enabled: true });
  const [drafts, setDrafts] = useState<Record<string, { name: string; sortOrder: string }>>(
    Object.fromEntries(
      initialCategories.map((item) => [item.id, { name: item.name, sortOrder: String(item.sortOrder) }]),
    ),
  );
  const selection = useListSelection(categories);

  const sortedCategories = useMemo(
    () => sortCategories(categories, sortField, sortDirection),
    [categories, sortDirection, sortField],
  );

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "name" ? "asc" : "asc");
  }

  function setDraft(categoryId: string, patch: Partial<{ name: string; sortOrder: string }>) {
    setDrafts((current) => ({
      ...current,
      [categoryId]: {
        name: current[categoryId]?.name ?? "",
        sortOrder: current[categoryId]?.sortOrder ?? "0",
        ...patch,
      },
    }));
  }

  function syncDraft(category: Category) {
    setDraft(category.id, { name: category.name, sortOrder: String(category.sortOrder) });
  }

  async function saveCategory(category: Category, body: Record<string, unknown>, patch: Partial<Category>) {
    setPendingAction(category.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        setMessage(data.error ?? "保存分类失败。");
        syncDraft(category);
        return;
      }

      setCategories((current) => current.map((item) => (item.id === category.id ? { ...item, ...patch } : item)));
      setMessage("分类已更新。");
    } catch {
      setMessage("保存分类失败。");
      syncDraft(category);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCreate() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/internal/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        setMessage(data.error ?? "创建分类失败。");
        return;
      }

      setCategories((current) => [...current, data.item]);
      setDraft(data.item.id, { name: data.item.name, sortOrder: String(data.item.sortOrder) });
      setShowForm(false);
      setForm({ name: "", sortOrder: categories.length, enabled: true });
      setMessage("分类已创建。");
    } catch {
      setMessage("创建分类失败。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    setPendingAction(category.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/categories/${category.id}`, {
        method: "DELETE",
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        setMessage(data.error ?? "删除分类失败。");
        return;
      }

      setCategories((current) => current.filter((item) => item.id !== category.id));
      selection.clearSelection();
      setDeleteTarget(null);
      setMessage("分类已删除。");
    } catch {
      setMessage("删除分类失败。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBulkAction(action: AppCategoryBulkAction) {
    if (selection.selectedIds.length === 0) {
      setMessage("请先勾选要处理的分类。");
      return;
    }

    setPendingAction(action.type);
    setMessage(null);

    try {
      const response = await fetch("/api/internal/admin/categories/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selection.selectedIds, action }),
      });
      const data = (await readResponseJson(response)) as BulkOperationResult & { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "批量操作失败。");
        return;
      }

      const successIds = new Set(data.results.filter((item) => item.status === "success").map((item) => item.id));

      setCategories((current) => {
        if (action.type === "delete") {
          return current.filter((item) => !successIds.has(item.id));
        }

        return current.map((item) => {
          if (!successIds.has(item.id)) {
            return item;
          }

          if (action.type === "setEnabled") {
            return { ...item, enabled: action.enabled };
          }

          if (action.type === "setSortOrder") {
            const offset = selection.selectedIds.indexOf(item.id);
            return { ...item, sortOrder: action.startSortOrder + Math.max(offset, 0) };
          }

          return item;
        });
      });

      selection.clearSelection();
      setMessage(`批量完成：成功 ${data.summary.successCount} 条，失败 ${data.summary.failureCount} 条。`);
    } catch {
      setMessage("批量操作失败。");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">分类支持在列表内直接改名称、排序和启用状态。</p>
          {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-full bg-[#0066DD] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0055BB]">
          + 新增分类
        </button>
      </div>

      <AdminBulkToolbar selectedCount={selection.selectedCount} label="已选分类" onToggleSelectAll={() => selection.toggleSelectAll(sortedCategories)}>
        <button type="button" onClick={() => void handleBulkAction({ type: "setEnabled", enabled: true })} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量启用</button>
        <button type="button" onClick={() => void handleBulkAction({ type: "setEnabled", enabled: false })} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量停用</button>
        <button type="button" onClick={() => { setBulkSortOrderInput("0"); setSortOrderDialogOpen(true); }} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量改排序</button>
        <button type="button" onClick={() => setBulkDeleteOpen(true)} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-50">批量删除</button>
      </AdminBulkToolbar>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">
                <input type="checkbox" checked={sortedCategories.length > 0 && sortedCategories.every((item) => selection.selectedIdSet.has(item.id))} onChange={() => selection.toggleSelectAll(sortedCategories)} aria-label="全选分类" />
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1">
                  名称
                  <span className="text-[10px]">{sortField === "name" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <button type="button" onClick={() => toggleSort("sortOrder")} className="inline-flex items-center gap-1">
                  排序
                  <span className="text-[10px]">{sortField === "sortOrder" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <button type="button" onClick={() => toggleSort("appCount")} className="inline-flex items-center gap-1">
                  应用数
                  <span className="text-[10px]">{sortField === "appCount" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedCategories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">暂无分类</td>
              </tr>
            ) : null}
            {sortedCategories.map((category) => {
              const draft = drafts[category.id] ?? { name: category.name, sortOrder: String(category.sortOrder) };
              return (
                <tr key={category.id} className="bg-white hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selection.selectedIdSet.has(category.id)} onChange={() => selection.toggleSelected(category.id)} aria-label={`勾选分类 ${category.name}`} />
                  </td>
                  <td className="px-4 py-3">
                    <input value={draft.name} onChange={(event) => setDraft(category.id, { name: event.target.value })} onBlur={() => void saveCategory(category, { name: draft.name }, { name: draft.name })} className="min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={draft.sortOrder} onChange={(event) => setDraft(category.id, { sortOrder: event.target.value })} onBlur={() => {
                      const sortOrder = Number(draft.sortOrder);
                      if (!Number.isInteger(sortOrder)) {
                        setMessage("排序值必须是整数。");
                        syncDraft(category);
                        return;
                      }
                      void saveCategory(category, { sortOrder }, { sortOrder });
                    }} className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{category.appCount}</td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                      <input type="checkbox" checked={category.enabled} onChange={(event) => void saveCategory(category, { enabled: event.target.checked }, { enabled: event.target.checked })} />
                      {category.enabled ? "启用" : "停用"}
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setDeleteTarget(category)} disabled={pendingAction === category.id} className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50">删除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">新增分类</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">分类名称 *</label>
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如：图像生成、视频生成" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">排序</label>
                <input type="number" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} className="rounded" />
                <span className="text-sm text-slate-600">立即启用</span>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">取消</button>
              <button type="button" onClick={() => void handleCreate()} disabled={saving || !form.name.trim()} className="rounded-full bg-[#0066DD] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0055BB] disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <FormDialog
        open={sortOrderDialogOpen}
        title="批量修改分类排序"
        description={`为当前选中的 ${selection.selectedCount} 个分类设置起始排序号，系统会按当前勾选顺序依次递增。`}
        confirmLabel="应用排序"
        pending={pendingAction === "setSortOrder"}
        confirmDisabled={!Number.isInteger(Number(bulkSortOrderInput))}
        onClose={() => setSortOrderDialogOpen(false)}
        onSubmit={() => {
          const startSortOrder = Number(bulkSortOrderInput);
          if (!Number.isInteger(startSortOrder)) {
            setMessage("排序号必须是整数。");
            return;
          }

          setSortOrderDialogOpen(false);
          void handleBulkAction({ type: "setSortOrder", startSortOrder });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">起始排序号</span>
          <input type="number" value={bulkSortOrderInput} onChange={(event) => setBulkSortOrderInput(event.target.value)} className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100" />
        </label>
      </FormDialog>

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="批量删除分类"
        description={`确认删除当前选中的 ${selection.selectedCount} 个分类吗？该操作不可撤销。`}
        confirmLabel="批量删除"
        confirmTone="danger"
        pending={pendingAction === "delete"}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => {
          setBulkDeleteOpen(false);
          void handleBulkAction({ type: "delete" });
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除分类"
        description={deleteTarget ? `确认删除分类 “${deleteTarget.name}” 吗？该操作不可撤销。` : ""}
        confirmLabel="删除"
        confirmTone="danger"
        pending={deleteTarget !== null && pendingAction === deleteTarget.id}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void handleDelete(deleteTarget);
          }
        }}
      />
    </div>
  );
}
