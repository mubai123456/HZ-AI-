"use client";

import { useMemo, useState } from "react";

import { AdminBulkToolbar } from "@/components/admin-bulk-toolbar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useListSelection } from "@/components/use-list-selection";
import type { AppBannerBulkAction, BulkOperationResult } from "@/lib/types";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  bgFrom: string;
  bgTo: string;
  sortOrder: number;
  enabled: boolean;
};

type SortField = "sortOrder" | "title";
type SortDirection = "asc" | "desc";

async function readResponseJson(response: Response) {
  return response.json().catch(() => ({}));
}

function sortBanners(items: Banner[], field: SortField, direction: SortDirection) {
  const factor = direction === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    if (field === "title") {
      return left.title.localeCompare(right.title, "zh-CN") * factor;
    }

    return (left.sortOrder - right.sortOrder) * factor;
  });
}

export function BannerManager({ initialBanners }: { initialBanners: Banner[] }) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [sortOrderDialogOpen, setSortOrderDialogOpen] = useState(false);
  const [bulkSortOrderInput, setBulkSortOrderInput] = useState("0");
  const [sortField, setSortField] = useState<SortField>("sortOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const defaultForm = {
    title: "",
    subtitle: "",
    linkUrl: "",
    linkLabel: "立即查看",
    bgFrom: "#EFF6FF",
    bgTo: "#EDE9FE",
    sortOrder: 0,
    enabled: true,
  };
  const [form, setForm] = useState(defaultForm);
  const [drafts, setDrafts] = useState<Record<string, { title: string; subtitle: string; linkLabel: string; linkUrl: string; sortOrder: string }>>(
    Object.fromEntries(
      initialBanners.map((item) => [
        item.id,
        {
          title: item.title,
          subtitle: item.subtitle ?? "",
          linkLabel: item.linkLabel ?? "",
          linkUrl: item.linkUrl ?? "",
          sortOrder: String(item.sortOrder),
        },
      ]),
    ),
  );
  const selection = useListSelection(banners);

  const sortedBanners = useMemo(
    () => sortBanners(banners, sortField, sortDirection),
    [banners, sortDirection, sortField],
  );

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  }

  function setDraft(bannerId: string, patch: Partial<{ title: string; subtitle: string; linkLabel: string; linkUrl: string; sortOrder: string }>) {
    setDrafts((current) => ({
      ...current,
      [bannerId]: {
        title: current[bannerId]?.title ?? "",
        subtitle: current[bannerId]?.subtitle ?? "",
        linkLabel: current[bannerId]?.linkLabel ?? "",
        linkUrl: current[bannerId]?.linkUrl ?? "",
        sortOrder: current[bannerId]?.sortOrder ?? "0",
        ...patch,
      },
    }));
  }

  function syncDraft(banner: Banner) {
    setDraft(banner.id, {
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      linkLabel: banner.linkLabel ?? "",
      linkUrl: banner.linkUrl ?? "",
      sortOrder: String(banner.sortOrder),
    });
  }

  async function saveBanner(banner: Banner, body: Record<string, unknown>, patch: Partial<Banner>) {
    setPendingAction(banner.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/banners/${banner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        setMessage(data.error ?? "保存 Banner 失败。");
        syncDraft(banner);
        return;
      }

      setBanners((current) => current.map((item) => (item.id === banner.id ? { ...item, ...patch } : item)));
      setMessage("Banner 已更新。");
    } catch {
      setMessage("保存 Banner 失败。");
      syncDraft(banner);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCreate() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/internal/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        setMessage(data.error ?? "创建 Banner 失败。");
        return;
      }

      setBanners((current) => [...current, data.item]);
      syncDraft(data.item);
      setShowForm(false);
      setForm(defaultForm);
      setMessage("Banner 已创建。");
    } catch {
      setMessage("创建 Banner 失败。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(banner: Banner) {
    setPendingAction(banner.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/banners/${banner.id}`, {
        method: "DELETE",
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        setMessage(data.error ?? "删除 Banner 失败。");
        return;
      }

      setBanners((current) => current.filter((item) => item.id !== banner.id));
      selection.clearSelection();
      setDeleteTarget(null);
      setMessage("Banner 已删除。");
    } catch {
      setMessage("删除 Banner 失败。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBulkAction(action: AppBannerBulkAction) {
    if (selection.selectedIds.length === 0) {
      setMessage("请先勾选要处理的 Banner。");
      return;
    }

    setPendingAction(action.type);
    setMessage(null);

    try {
      const response = await fetch("/api/internal/admin/banners/bulk", {
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

      setBanners((current) => {
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
          <p className="text-sm text-slate-500">Banner 支持在列表内直接改文案、链接、排序和启用状态。</p>
          {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-full bg-[#0066DD] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0055BB]">
          + 新增 Banner
        </button>
      </div>

      <AdminBulkToolbar selectedCount={selection.selectedCount} label="已选 Banner" onToggleSelectAll={() => selection.toggleSelectAll(sortedBanners)}>
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
                <input type="checkbox" checked={sortedBanners.length > 0 && sortedBanners.every((item) => selection.selectedIdSet.has(item.id))} onChange={() => selection.toggleSelectAll(sortedBanners)} aria-label="全选 Banner" />
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <button type="button" onClick={() => toggleSort("title")} className="inline-flex items-center gap-1">
                  标题
                  <span className="text-[10px]">{sortField === "title" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium">副标题</th>
              <th className="px-4 py-3 text-left font-medium">按钮文案</th>
              <th className="px-4 py-3 text-left font-medium">链接地址</th>
              <th className="px-4 py-3 text-left font-medium">颜色预览</th>
              <th className="px-4 py-3 text-left font-medium">
                <button type="button" onClick={() => toggleSort("sortOrder")} className="inline-flex items-center gap-1">
                  排序
                  <span className="text-[10px]">{sortField === "sortOrder" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedBanners.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">暂无 Banner</td>
              </tr>
            ) : null}
            {sortedBanners.map((banner) => {
              const draft = drafts[banner.id] ?? {
                title: banner.title,
                subtitle: banner.subtitle ?? "",
                linkLabel: banner.linkLabel ?? "",
                linkUrl: banner.linkUrl ?? "",
                sortOrder: String(banner.sortOrder),
              };

              return (
                <tr key={banner.id} className="bg-white hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selection.selectedIdSet.has(banner.id)} onChange={() => selection.toggleSelected(banner.id)} aria-label={`勾选 Banner ${banner.title}`} />
                  </td>
                  <td className="px-4 py-3">
                    <input value={draft.title} onChange={(event) => setDraft(banner.id, { title: event.target.value })} onBlur={() => void saveBanner(banner, { title: draft.title }, { title: draft.title })} className="min-w-[160px] rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </td>
                  <td className="px-4 py-3">
                    <input value={draft.subtitle} onChange={(event) => setDraft(banner.id, { subtitle: event.target.value })} onBlur={() => void saveBanner(banner, { subtitle: draft.subtitle || null }, { subtitle: draft.subtitle || null })} className="min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </td>
                  <td className="px-4 py-3">
                    <input value={draft.linkLabel} onChange={(event) => setDraft(banner.id, { linkLabel: event.target.value })} onBlur={() => void saveBanner(banner, { linkLabel: draft.linkLabel || null }, { linkLabel: draft.linkLabel || null })} className="min-w-[120px] rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </td>
                  <td className="px-4 py-3">
                    <input value={draft.linkUrl} onChange={(event) => setDraft(banner.id, { linkUrl: event.target.value })} onBlur={() => void saveBanner(banner, { linkUrl: draft.linkUrl || null }, { linkUrl: draft.linkUrl || null })} className="min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 w-20 rounded-md" style={{ background: `linear-gradient(to right, ${banner.bgFrom}, ${banner.bgTo})` }} />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={draft.sortOrder} onChange={(event) => setDraft(banner.id, { sortOrder: event.target.value })} onBlur={() => {
                      const sortOrder = Number(draft.sortOrder);
                      if (!Number.isInteger(sortOrder)) {
                        setMessage("排序值必须是整数。");
                        syncDraft(banner);
                        return;
                      }
                      void saveBanner(banner, { sortOrder }, { sortOrder });
                    }} className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                      <input type="checkbox" checked={banner.enabled} onChange={(event) => void saveBanner(banner, { enabled: event.target.checked }, { enabled: event.target.checked })} />
                      {banner.enabled ? "启用" : "停用"}
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setDeleteTarget(banner)} disabled={pendingAction === banner.id} className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50">删除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">新增 Banner</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">标题 *</label>
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">副标题</label>
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">按钮文案</label>
                  <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.linkLabel} onChange={(event) => setForm({ ...form, linkLabel: event.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">排序</label>
                  <input type="number" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">链接地址</label>
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.linkUrl} onChange={(event) => setForm({ ...form, linkUrl: event.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-xs font-medium text-slate-500">渐变起始色</span>
                  <input type="color" className="mt-1 block h-10 w-full rounded border border-slate-200 bg-white p-1" value={form.bgFrom} onChange={(event) => setForm({ ...form, bgFrom: event.target.value })} />
                </label>
                <label>
                  <span className="text-xs font-medium text-slate-500">渐变结束色</span>
                  <input type="color" className="mt-1 block h-10 w-full rounded border border-slate-200 bg-white p-1" value={form.bgTo} onChange={(event) => setForm({ ...form, bgTo: event.target.value })} />
                </label>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} className="rounded" />
                <span className="text-sm text-slate-600">立即启用</span>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">取消</button>
              <button type="button" onClick={() => void handleCreate()} disabled={saving || !form.title.trim()} className="rounded-full bg-[#0066DD] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0055BB] disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <FormDialog
        open={sortOrderDialogOpen}
        title="批量修改 Banner 排序"
        description={`为当前选中的 ${selection.selectedCount} 个 Banner 设置起始排序号，系统会按当前勾选顺序依次递增。`}
        confirmLabel="应用排序"
        pending={pendingAction === "setSortOrder"}
        confirmDisabled={!Number.isInteger(Number(bulkSortOrderInput))}
        onClose={() => setSortOrderDialogOpen(false)}
        onSubmit={() => {
          const startSortOrder = Number(bulkSortOrderInput);
          if (!Number.isInteger(startSortOrder)) {
            setMessage("排序值必须是整数。");
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
        title="批量删除 Banner"
        description={`确认删除当前选中的 ${selection.selectedCount} 个 Banner 吗？该操作不可撤销。`}
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
        title="删除 Banner"
        description={deleteTarget ? `确认删除 Banner “${deleteTarget.title}” 吗？该操作不可撤销。` : ""}
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
