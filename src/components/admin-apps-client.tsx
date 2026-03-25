"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminBulkToolbar } from "@/components/admin-bulk-toolbar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { ImageLightbox } from "@/components/image-lightbox";
import { useListSelection } from "@/components/use-list-selection";
import type { AppWithRunCount } from "@/lib/db/apps";
import type { AppCategoryItem } from "@/lib/db/categories";
import { formatPriceFen, parsePriceYuanToFen } from "@/lib/money";
import type { AppBulkAction, AppTagRecord, BulkOperationResult } from "@/lib/types";

type SortField = "sortOrder" | "updatedAt" | "runCount" | "name" | "estimatedPriceFen";
type SortDirection = "asc" | "desc";

interface Props {
  apps: AppWithRunCount[];
  categories: AppCategoryItem[];
  appTags: AppTagRecord[];
  embedded?: boolean;
}

function formatTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function splitTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n，]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function sortApps(items: AppWithRunCount[], sortField: SortField, direction: SortDirection) {
  const factor = direction === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    if (sortField === "updatedAt") {
      return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * factor;
    }

    if (sortField === "runCount") {
      return (left.runCount - right.runCount) * factor || left.name.localeCompare(right.name, "zh-CN");
    }

    if (sortField === "estimatedPriceFen") {
      return (left.estimatedPriceFen - right.estimatedPriceFen) * factor;
    }

    if (sortField === "name") {
      return left.name.localeCompare(right.name, "zh-CN") * factor;
    }

    return (left.sortOrder - right.sortOrder) * factor;
  });
}

async function readResponseJson(response: Response) {
  return response.json().catch(() => ({}));
}

function SortButton({
  label,
  field,
  activeField,
  direction,
  onToggle,
}: {
  label: string;
  field: SortField;
  activeField: SortField;
  direction: SortDirection;
  onToggle: (field: SortField) => void;
}) {
  const active = activeField === field;

  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className={`inline-flex items-center gap-1 transition ${active ? "text-slate-700" : "text-slate-400 hover:text-slate-600"}`}
    >
      {label}
      <span className="text-[10px]">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

export function AdminAppsClient({ apps, categories, appTags, embedded = false }: Props) {
  const [items, setItems] = useState(apps);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [tag, setTag] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sortField, setSortField] = useState<SortField>("sortOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppWithRunCount | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AppWithRunCount | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [sortDialogOpen, setSortDialogOpen] = useState(false);
  const [bulkCategoryInput, setBulkCategoryInput] = useState("");
  const [bulkTagsInput, setBulkTagsInput] = useState("");
  const [bulkSortOrderInput, setBulkSortOrderInput] = useState("0");
  const [drafts, setDrafts] = useState<Record<string, { category: string; tagsText: string; estimatedPriceYuan: string; sortOrder: string }>>(
    Object.fromEntries(
      apps.map((app) => [
        app.id,
        {
          category: app.category ?? "",
          tagsText: app.tags.join(", "),
          estimatedPriceYuan: formatPriceFen(app.estimatedPriceFen).replace("¥", ""),
          sortOrder: String(app.sortOrder),
        },
      ]),
    ),
  );
  const selection = useListSelection(items);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = items.filter((app) => {
      const matchesQuery =
        keyword.length === 0 ||
        app.name.toLowerCase().includes(keyword) ||
        app.code.toLowerCase().includes(keyword) ||
        app.providerAppId.toLowerCase().includes(keyword);
      const matchesCategory = category === "ALL" || (app.category ?? "") === category;
      const matchesTag = tag === "ALL" || app.tags.includes(tag);
      const matchesStatus =
        status === "ALL" ||
        (status === "ENABLED" && app.enabled) ||
        (status === "DISABLED" && !app.enabled);

      return matchesQuery && matchesCategory && matchesTag && matchesStatus;
    });

    return sortApps(filtered, sortField, sortDirection);
  }, [category, items, query, sortDirection, sortField, status, tag]);

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selection.selectedIdSet.has(item.id));

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "updatedAt" || field === "runCount" ? "desc" : "asc");
  }

  function setDraft(appId: string, patch: Partial<{ category: string; tagsText: string; estimatedPriceYuan: string; sortOrder: string }>) {
    setDrafts((current) => ({
      ...current,
      [appId]: {
        category: current[appId]?.category ?? "",
        tagsText: current[appId]?.tagsText ?? "",
        estimatedPriceYuan: current[appId]?.estimatedPriceYuan ?? "0.00",
        sortOrder: current[appId]?.sortOrder ?? "0",
        ...patch,
      },
    }));
  }

  function syncDraft(app: AppWithRunCount) {
    setDraft(app.id, {
      category: app.category ?? "",
      tagsText: app.tags.join(", "),
      estimatedPriceYuan: formatPriceFen(app.estimatedPriceFen).replace("¥", ""),
      sortOrder: String(app.sortOrder),
    });
  }

  async function saveApp(app: AppWithRunCount, body: Record<string, unknown>, patch: Partial<AppWithRunCount>) {
    setPendingAction(app.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/apps/${encodeURIComponent(app.code)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        setMessage(data.error ?? "保存应用失败。");
        syncDraft(app);
        return;
      }

      setItems((current) =>
        current.map((item) => (item.id === app.id ? { ...item, ...patch, updatedAt: new Date() } : item)),
      );
      setMessage("应用已更新。");
    } catch {
      setMessage("保存应用失败。");
      syncDraft(app);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleInlineCategorySave(app: AppWithRunCount, nextCategory: string) {
    setDraft(app.id, { category: nextCategory });
    await saveApp(app, { category: nextCategory || null }, { category: nextCategory || null });
  }

  async function handleInlineTagsSave(app: AppWithRunCount) {
    const tags = splitTags(drafts[app.id]?.tagsText ?? "");
    await saveApp(app, { tags }, { tags });
  }

  async function handleInlinePriceSave(app: AppWithRunCount) {
    try {
      const yuan = (drafts[app.id]?.estimatedPriceYuan ?? "").trim();
      const fen = parsePriceYuanToFen(yuan);
      await saveApp(
        app,
        { estimatedPriceYuan: yuan },
        { estimatedPriceFen: fen, estimatedPriceLabel: formatPriceFen(fen) },
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "预计费用格式不正确");
      syncDraft(app);
    }
  }

  async function handleInlineSortOrderSave(app: AppWithRunCount) {
    const sortOrder = Number(drafts[app.id]?.sortOrder ?? app.sortOrder);
    if (!Number.isInteger(sortOrder)) {
      setMessage("排序值必须是整数。");
      syncDraft(app);
      return;
    }

    await saveApp(app, { sortOrder }, { sortOrder });
  }

  async function handleBulkAction(action: AppBulkAction) {
    if (selection.selectedIds.length === 0) {
      setMessage("请先勾选要处理的应用。");
      return;
    }

    setPendingAction(action.type);
    setMessage(null);

    try {
      const response = await fetch("/api/internal/admin/apps/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selection.selectedIds,
          action,
        }),
      });
      const data = (await readResponseJson(response)) as BulkOperationResult & { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "批量操作失败。");
        return;
      }

      const successIds = new Set(
        data.results.filter((item) => item.status === "success").map((item) => item.id),
      );

      setItems((current) => {
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

          if (action.type === "setCategory") {
            return { ...item, category: action.category };
          }

          if (action.type === "setShareResults") {
            return { ...item, shareResults: action.shareResults };
          }

          if (action.type === "setTags") {
            return { ...item, tags: action.tags };
          }

          if (action.type === "setSortOrder") {
            const offset = selection.selectedIds.indexOf(item.id);
            return { ...item, sortOrder: action.startSortOrder + Math.max(offset, 0) };
          }

          return item;
        });
      });

      selection.clearSelection();
      setMessage(
        `批量处理完成：成功 ${data.summary.successCount} 项，跳过 ${data.summary.skippedCount} 项，失败 ${data.summary.failureCount} 项。`,
      );
    } catch {
      setMessage("批量操作失败。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSingleDelete(app: AppWithRunCount) {
    setPendingAction(app.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/apps/${encodeURIComponent(app.code)}`, {
        method: "DELETE",
      });
      const data = await readResponseJson(response);
      if (!response.ok) {
        setMessage(data.error ?? "删除应用失败。");
        return;
      }

      setItems((current) => current.filter((item) => item.id !== app.id));
      setMessage(`已删除应用：${app.name}`);
    } catch {
      setMessage("删除应用失败。");
    } finally {
      setDeleteTarget(null);
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      {embedded ? null : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#0066DD]">应用配置</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">应用列表</h1>
            <p className="mt-2 text-sm text-slate-500">
              支持列表内直接改分类、标签、排序、预计费用和开关状态，不用再逐条进详情页。
            </p>
          </div>
          <Link
            href="/admin/apps/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#0066DD] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-[#0055BB]"
          >
            + 新建应用
          </Link>
        </div>
      )}

      {message ? (
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {message}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_180px]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">搜索应用</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100"
              placeholder="应用名称 / code / 应用 ID"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">分类</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
            >
              <option value="ALL">全部分类</option>
              {categories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">标签</span>
            <select
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
            >
              <option value="ALL">全部标签</option>
              {appTags.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">状态</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
            >
              <option value="ALL">全部状态</option>
              <option value="ENABLED">已启用</option>
              <option value="DISABLED">已停用</option>
            </select>
          </label>
        </div>
      </section>

      <AdminBulkToolbar
        selectedCount={selection.selectedCount}
        label="已选应用"
        onToggleSelectAll={() => selection.toggleSelectAll(filteredItems)}
      >
        <button type="button" onClick={() => void handleBulkAction({ type: "setEnabled", enabled: true })} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量启用</button>
        <button type="button" onClick={() => void handleBulkAction({ type: "setEnabled", enabled: false })} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量停用</button>
        <button type="button" onClick={() => { setBulkCategoryInput(""); setCategoryDialogOpen(true); }} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量改分类</button>
        <button type="button" onClick={() => { setBulkTagsInput(""); setTagDialogOpen(true); }} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量改标签</button>
        <button type="button" onClick={() => { setBulkSortOrderInput("0"); setSortDialogOpen(true); }} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量改排序</button>
        <button type="button" onClick={() => void handleBulkAction({ type: "setShareResults", shareResults: true })} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量开共享</button>
        <button type="button" onClick={() => void handleBulkAction({ type: "setShareResults", shareResults: false })} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量关共享</button>
        <button type="button" onClick={() => setBulkDeleteOpen(true)} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-50">批量删除</button>
      </AdminBulkToolbar>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-4 font-medium">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={() => selection.toggleSelectAll(filteredItems)}
                    aria-label="select-all-filtered-apps"
                  />
                </th>
                <th className="px-5 py-4 font-medium"><SortButton label="应用" field="name" activeField={sortField} direction={sortDirection} onToggle={toggleSort} /></th>
                <th className="px-5 py-4 font-medium">应用 ID</th>
                <th className="px-5 py-4 font-medium">分类</th>
                <th className="px-5 py-4 font-medium">标签</th>
                <th className="px-5 py-4 font-medium"><SortButton label="预计费用" field="estimatedPriceFen" activeField={sortField} direction={sortDirection} onToggle={toggleSort} /></th>
                <th className="px-5 py-4 font-medium"><SortButton label="排序值" field="sortOrder" activeField={sortField} direction={sortDirection} onToggle={toggleSort} /></th>
                <th className="px-5 py-4 font-medium"><SortButton label="运行次数" field="runCount" activeField={sortField} direction={sortDirection} onToggle={toggleSort} /></th>
                <th className="px-5 py-4 font-medium">状态 / 共享</th>
                <th className="px-5 py-4 font-medium"><SortButton label="更新时间" field="updatedAt" activeField={sortField} direction={sortDirection} onToggle={toggleSort} /></th>
                <th className="px-5 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((app) => {
                const draft = drafts[app.id] ?? {
                  category: app.category ?? "",
                  tagsText: app.tags.join(", "),
                  estimatedPriceYuan: formatPriceFen(app.estimatedPriceFen).replace("¥", ""),
                  sortOrder: String(app.sortOrder),
                };

                return (
                  <tr key={app.id} className="align-top hover:bg-slate-50/80">
                    <td className="px-3 py-4">
                      <input type="checkbox" checked={selection.selectedIdSet.has(app.id)} onChange={() => selection.toggleSelected(app.id)} aria-label={`select-app-${app.id}`} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          aria-label={`preview-cover-${app.id}`}
                          onClick={() => setPreviewTarget(app)}
                          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-1"
                        >
                          {app.coverPoster ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={app.coverPoster} alt={`${app.name} cover thumbnail`} className="h-full w-full object-contain" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">无图</div>
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950">{app.name}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{app.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">{app.providerAppId || "-"}</td>
                    <td className="px-5 py-4">
                      <select
                        value={draft.category}
                        onChange={(event) => void handleInlineCategorySave(app, event.target.value)}
                        className="min-w-[120px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">未分类</option>
                        {categories.map((item) => (
                          <option key={item.id} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        value={draft.tagsText}
                        onChange={(event) => setDraft(app.id, { tagsText: event.target.value })}
                        onBlur={() => void handleInlineTagsSave(app)}
                        className="min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        placeholder="多个标签用逗号分隔"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input
                        value={draft.estimatedPriceYuan}
                        onChange={(event) => setDraft(app.id, { estimatedPriceYuan: event.target.value })}
                        onBlur={() => void handleInlinePriceSave(app)}
                        className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-slate-400">{app.estimatedPriceLabel}</p>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        value={draft.sortOrder}
                        onChange={(event) => setDraft(app.id, { sortOrder: event.target.value })}
                        onBlur={() => void handleInlineSortOrderSave(app)}
                        className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{app.runCount}</td>
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={app.enabled}
                            onChange={(event) =>
                              void saveApp(app, { enabled: event.target.checked }, { enabled: event.target.checked })
                            }
                          />
                          {app.enabled ? "已启用" : "已停用"}
                        </label>
                        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={app.shareResults}
                            onChange={(event) =>
                              void saveApp(
                                app,
                                { shareResults: event.target.checked },
                                { shareResults: event.target.checked },
                              )
                            }
                          />
                          结果共享
                        </label>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatTime(app.updatedAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/apps/${encodeURIComponent(app.code)}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300">编辑</Link>
                        <Link href={`/apps/${encodeURIComponent(app.code)}`} className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:border-sky-300">访问</Link>
                        <button type="button" onClick={() => setDeleteTarget(app)} disabled={pendingAction === app.id} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50">删除</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-sm text-slate-400">
                    当前筛选条件下没有应用
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {previewTarget?.coverPoster ? (
        <ImageLightbox assets={[{ id: previewTarget.id, name: previewTarget.name, url: previewTarget.coverPoster }]} onClose={() => setPreviewTarget(null)} />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除应用"
        description={deleteTarget ? `确定要删除应用 “${deleteTarget.name}” 吗？` : null}
        confirmLabel="确认删除"
        confirmTone="danger"
        pending={deleteTarget ? pendingAction === deleteTarget.id : false}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void handleSingleDelete(deleteTarget);
          }
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="批量删除应用"
        description={`确定要删除当前选中的 ${selection.selectedCount} 个应用吗？成功删除的应用会从列表中移除。`}
        confirmLabel="批量删除"
        confirmTone="danger"
        pending={pendingAction === "delete"}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => {
          setBulkDeleteOpen(false);
          void handleBulkAction({ type: "delete" });
        }}
      />

      <FormDialog
        open={categoryDialogOpen}
        title="批量修改分类"
        description={`为当前选中的 ${selection.selectedCount} 个应用设置分类。留空会清空现有分类。`}
        confirmLabel="应用分类"
        pending={pendingAction === "setCategory"}
        onClose={() => setCategoryDialogOpen(false)}
        onSubmit={() => {
          setCategoryDialogOpen(false);
          void handleBulkAction({ type: "setCategory", category: bulkCategoryInput.trim() || null });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">分类名称</span>
          <input
            value={bulkCategoryInput}
            onChange={(event) => setBulkCategoryInput(event.target.value)}
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100"
            placeholder="例如：文生图、图生视频"
          />
        </label>
      </FormDialog>

      <FormDialog
        open={tagDialogOpen}
        title="批量修改标签"
        description={`为当前选中的 ${selection.selectedCount} 个应用设置标签，多个标签请使用逗号分隔。`}
        confirmLabel="应用标签"
        pending={pendingAction === "setTags"}
        onClose={() => setTagDialogOpen(false)}
        onSubmit={() => {
          setTagDialogOpen(false);
          void handleBulkAction({ type: "setTags", tags: splitTags(bulkTagsInput) });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">标签列表</span>
          <textarea
            value={bulkTagsInput}
            onChange={(event) => setBulkTagsInput(event.target.value)}
            className="min-h-28 w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100"
            placeholder="例如：视频生成, 电商, 爆款模板"
          />
        </label>
      </FormDialog>

      <FormDialog
        open={sortDialogOpen}
        title="批量修改排序"
        description={`为当前选中的 ${selection.selectedCount} 个应用设置起始排序值，系统会按勾选顺序依次递增。`}
        confirmLabel="应用排序"
        pending={pendingAction === "setSortOrder"}
        confirmDisabled={!Number.isInteger(Number(bulkSortOrderInput))}
        onClose={() => setSortDialogOpen(false)}
        onSubmit={() => {
          const startSortOrder = Number(bulkSortOrderInput);
          if (!Number.isInteger(startSortOrder)) {
            setMessage("排序值必须是整数。");
            return;
          }

          setSortDialogOpen(false);
          void handleBulkAction({ type: "setSortOrder", startSortOrder });
        }}
      >
        <label className="block space-y-2" htmlFor="sort-order-start">
          <span className="text-sm font-medium text-slate-700">起始排序值</span>
          <input
            id="sort-order-start"
            aria-label="sort-order-start"
            type="number"
            value={bulkSortOrderInput}
            onChange={(event) => setBulkSortOrderInput(event.target.value)}
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </FormDialog>
    </div>
  );
}
