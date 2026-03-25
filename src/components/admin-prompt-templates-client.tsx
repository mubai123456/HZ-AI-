"use client";

import { useMemo, useState } from "react";

import { AdminBulkToolbar } from "@/components/admin-bulk-toolbar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AdminPromptTemplateEdit } from "@/components/admin-prompt-template-edit";
import { FormDialog } from "@/components/form-dialog";
import { useListSelection } from "@/components/use-list-selection";
import type {
  AppDefinition,
  BulkOperationResult,
  PromptTemplateAdminRecord,
  PromptTemplateBulkAction,
  PromptTemplateCategoryRecord,
  PromptTemplateScopeMode,
  PromptTemplateTagRecord,
} from "@/lib/types";

interface Props {
  initialTemplates: PromptTemplateAdminRecord[];
  initialTags: PromptTemplateTagRecord[];
  initialCategories: PromptTemplateCategoryRecord[];
  apps: AppDefinition[];
  embedded?: boolean;
}

type StatusFilter = "all" | "enabled" | "disabled";
type ScopeFilter = "all" | "GLOBAL" | "LIMITED";
type SortField = "updatedAt" | "usageCount" | "name";
type SortDirection = "asc" | "desc";

function splitCommaList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n，]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

function scopeLabel(template: PromptTemplateAdminRecord) {
  if (template.scopeMode === "GLOBAL") {
    return "全站通用";
  }

  if (template.scopeAppCodes.length > 0) {
    return `限定 ${template.scopeAppCodes.length} 个应用`;
  }

  return "限定应用";
}

async function readResponseJson(response: Response) {
  return response.json().catch(() => ({}));
}

function sortTemplates(items: PromptTemplateAdminRecord[], field: SortField, direction: SortDirection) {
  const factor = direction === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    if (field === "usageCount") {
      return (left.usageCount - right.usageCount) * factor;
    }

    if (field === "name") {
      return left.name.localeCompare(right.name, "zh-CN") * factor;
    }

    return left.updatedAt.localeCompare(right.updatedAt) * factor;
  });
}

export function AdminPromptTemplatesClient({
  initialTemplates,
  initialTags,
  initialCategories,
  apps,
  embedded = false,
}: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [tags, setTags] = useState(initialTags);
  const [categories, setCategories] = useState(initialCategories);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplateAdminRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromptTemplateAdminRecord | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [bulkCategoryIdInput, setBulkCategoryIdInput] = useState("");
  const [bulkTagsDialogOpen, setBulkTagsDialogOpen] = useState(false);
  const [bulkTagsInput, setBulkTagsInput] = useState("");
  const [bulkScopeDialogOpen, setBulkScopeDialogOpen] = useState(false);
  const [bulkScopeMode, setBulkScopeMode] = useState<PromptTemplateScopeMode>("GLOBAL");
  const [bulkScopeAppsInput, setBulkScopeAppsInput] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { name: string; categoryId: string; tagsText: string; scopeMode: PromptTemplateScopeMode; scopeAppCodesText: string }>>(
    Object.fromEntries(
      initialTemplates.map((item) => [
        item.id,
        {
          name: item.name,
          categoryId: item.categoryId ?? "",
          tagsText: item.tags.join(", "),
          scopeMode: item.scopeMode,
          scopeAppCodesText: item.scopeAppCodes.join(", "),
        },
      ]),
    ),
  );

  const filteredTemplates = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    const filtered = templates.filter((template) => {
      if (statusFilter === "enabled" && !template.enabled) {
        return false;
      }
      if (statusFilter === "disabled" && template.enabled) {
        return false;
      }
      if (scopeFilter !== "all" && template.scopeMode !== scopeFilter) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }

      const haystack = [
        template.name,
        template.description ?? "",
        template.categoryName ?? "",
        template.tags.join(" "),
        template.scopeAppCodes.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedKeyword);
    });

    return sortTemplates(filtered, sortField, sortDirection);
  }, [keyword, scopeFilter, sortDirection, sortField, statusFilter, templates]);

  const selection = useListSelection(templates);
  const allFilteredSelected =
    filteredTemplates.length > 0 && filteredTemplates.every((item) => selection.selectedIdSet.has(item.id));

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "updatedAt" || field === "usageCount" ? "desc" : "asc");
  }

  function setDraft(templateId: string, patch: Partial<{ name: string; categoryId: string; tagsText: string; scopeMode: PromptTemplateScopeMode; scopeAppCodesText: string }>) {
    setDrafts((current) => ({
      ...current,
      [templateId]: {
        name: current[templateId]?.name ?? "",
        categoryId: current[templateId]?.categoryId ?? "",
        tagsText: current[templateId]?.tagsText ?? "",
        scopeMode: current[templateId]?.scopeMode ?? "GLOBAL",
        scopeAppCodesText: current[templateId]?.scopeAppCodesText ?? "",
        ...patch,
      },
    }));
  }

  function syncDraft(template: PromptTemplateAdminRecord) {
    setDraft(template.id, {
      name: template.name,
      categoryId: template.categoryId ?? "",
      tagsText: template.tags.join(", "),
      scopeMode: template.scopeMode,
      scopeAppCodesText: template.scopeAppCodes.join(", "),
    });
  }

  async function saveTemplate(template: PromptTemplateAdminRecord, patch: Partial<PromptTemplateAdminRecord>) {
    const draft = drafts[template.id];
    const nextTemplate: PromptTemplateAdminRecord = {
      ...template,
      ...patch,
      name: patch.name ?? draft?.name ?? template.name,
      categoryId: patch.categoryId ?? draft?.categoryId ?? template.categoryId,
      tags: patch.tags ?? splitCommaList(draft?.tagsText ?? template.tags.join(", ")),
      scopeMode: patch.scopeMode ?? draft?.scopeMode ?? template.scopeMode,
      scopeAppCodes:
        patch.scopeAppCodes ??
        ((patch.scopeMode ?? draft?.scopeMode ?? template.scopeMode) === "GLOBAL"
          ? []
          : splitCommaList(draft?.scopeAppCodesText ?? template.scopeAppCodes.join(", "))),
    };

    setPendingAction(template.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/prompt-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appCode: nextTemplate.appCode,
          categoryId: nextTemplate.categoryId || null,
          name: nextTemplate.name,
          description: nextTemplate.description,
          coverImageUrl: nextTemplate.coverImageUrl,
          sampleMediaType: nextTemplate.sampleMediaType,
          sampleMediaUrl: nextTemplate.sampleMediaUrl,
          samplePosterUrl: nextTemplate.samplePosterUrl,
          templatePrompt: nextTemplate.templatePrompt,
          tags: nextTemplate.tags,
          enabled: nextTemplate.enabled,
          scopeMode: nextTemplate.scopeMode,
          scopeAppCodes: nextTemplate.scopeMode === "GLOBAL" ? [] : nextTemplate.scopeAppCodes,
        }),
      });

      const data = (await readResponseJson(response)) as { error?: string; item?: PromptTemplateAdminRecord };
      if (!response.ok || !data.item) {
        setMessage(data.error ?? "保存模板失败。");
        syncDraft(template);
        return;
      }

      setTemplates((current) => current.map((item) => (item.id === template.id ? data.item! : item)));
      syncDraft(data.item);
      setMessage("模板已更新。");
    } catch {
      setMessage("保存模板失败。");
      syncDraft(template);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBulkTemplates(action: PromptTemplateBulkAction) {
    if (selection.selectedIds.length === 0) {
      setMessage("请先选择模板。");
      return;
    }

    setPendingAction(action.type);
    setMessage(null);

    try {
      const response = await fetch("/api/internal/admin/prompt-templates/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selection.selectedIds,
          action,
        }),
      });

      const data = (await readResponseJson(response)) as BulkOperationResult & {
        error?: string;
        results: Array<{ id: string; status: "success" | "skipped" | "failed" }>;
        summary: { successCount: number; skippedCount: number; failureCount: number };
      };

      if (!response.ok) {
        setMessage(data.error ?? "批量操作失败。");
        return;
      }

      const successIds = new Set(data.results.filter((item) => item.status === "success").map((item) => item.id));

      setTemplates((current) => {
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
            const category = categories.find((entry) => entry.id === action.categoryId) ?? null;
            return {
              ...item,
              categoryId: action.categoryId,
              categoryName: category?.name ?? null,
              categoryColor: category?.color ?? null,
              categoryOrder: category?.sortOrder ?? null,
            };
          }

          if (action.type === "setTags") {
            return { ...item, tags: action.tags };
          }

          if (action.type === "setScope") {
            return {
              ...item,
              scopeMode: action.scopeMode,
              scopeAppCodes: action.scopeMode === "GLOBAL" ? [] : action.scopeAppCodes ?? [],
            };
          }

          return item;
        });
      });

      selection.clearSelection();
      setMessage(
        `批量完成：成功 ${data.summary.successCount} 条，跳过 ${data.summary.skippedCount} 条，失败 ${data.summary.failureCount} 条。`,
      );
    } catch {
      setMessage("批量操作失败。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteTemplate(template: PromptTemplateAdminRecord) {
    setPendingAction(template.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/prompt-templates/${template.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await readResponseJson(response)) as { error?: string };
        setMessage(data.error ?? "删除模板失败。");
        return;
      }

      setTemplates((current) => current.filter((item) => item.id !== template.id));
      selection.clearSelection();
      setMessage("模板已删除。");
    } catch {
      setMessage("删除模板失败。");
    } finally {
      setDeleteTarget(null);
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-end gap-3">
        {!embedded ? (
          <div className="mr-auto">
            <p className="text-sm font-semibold text-blue-600">提示词资产中心</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">提示词模板管理</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              支持在列表内直接修改模板名称、分类、标签、作用范围和启用状态。
            </p>
          </div>
        ) : null}
        <button type="button" onClick={() => { setEditingTemplate(null); setEditorOpen(true); }} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">
          新建模板
        </button>
      </section>

      {message ? (
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</div>
      ) : null}

      <section className="rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label className="text-sm font-medium text-slate-700">搜索模板</label>
              <input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索名称、简介、分类或标签" className="mt-2 h-11 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white" />
            </div>

            <label className="text-sm font-medium text-slate-700">
              状态
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="mt-2 h-11 rounded-[16px] border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400">
                <option value="all">全部状态</option>
                <option value="enabled">仅看启用</option>
                <option value="disabled">仅看停用</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              范围
              <select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)} className="mt-2 h-11 rounded-[16px] border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400">
                <option value="all">全部范围</option>
                <option value="GLOBAL">全站通用</option>
                <option value="LIMITED">限定应用</option>
              </select>
            </label>
          </div>
        </div>

        <div className="px-6 py-5">
          <AdminBulkToolbar selectedCount={selection.selectedCount} label="已选模板" onToggleSelectAll={() => selection.toggleSelectAll(filteredTemplates)}>
            <button type="button" onClick={() => void handleBulkTemplates({ type: "setEnabled", enabled: true })} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量启用</button>
            <button type="button" onClick={() => void handleBulkTemplates({ type: "setEnabled", enabled: false })} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量停用</button>
            <button type="button" onClick={() => { setBulkCategoryIdInput(""); setBulkCategoryDialogOpen(true); }} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量改分类</button>
            <button type="button" onClick={() => { setBulkTagsInput(""); setBulkTagsDialogOpen(true); }} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量改标签</button>
            <button type="button" onClick={() => { setBulkScopeMode("GLOBAL"); setBulkScopeAppsInput(""); setBulkScopeDialogOpen(true); }} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量改范围</button>
            <button type="button" onClick={() => setBulkDeleteOpen(true)} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-50">批量删除</button>
          </AdminBulkToolbar>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-4 font-medium">
                  <input type="checkbox" checked={allFilteredSelected} onChange={() => selection.toggleSelectAll(filteredTemplates)} aria-label="全选当前筛选模板" />
                </th>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1">
                    模板名称
                    <span className="text-[10px]">{sortField === "name" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">分类</th>
                <th className="px-6 py-4 font-medium">标签</th>
                <th className="px-6 py-4 font-medium">适用范围</th>
                <th className="px-6 py-4 font-medium">启用状态</th>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => toggleSort("usageCount")} className="inline-flex items-center gap-1">
                    使用次数
                    <span className="text-[10px]">{sortField === "usageCount" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => toggleSort("updatedAt")} className="inline-flex items-center gap-1">
                    更新时间
                    <span className="text-[10px]">{sortField === "updatedAt" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">
                    当前筛选条件下没有找到模板。
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((template) => {
                  const draft = drafts[template.id] ?? {
                    name: template.name,
                    categoryId: template.categoryId ?? "",
                    tagsText: template.tags.join(", "),
                    scopeMode: template.scopeMode,
                    scopeAppCodesText: template.scopeAppCodes.join(", "),
                  };

                  return (
                    <tr key={template.id} className="align-top">
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selection.selectedIdSet.has(template.id)} onChange={() => selection.toggleSelected(template.id)} aria-label={`勾选模板 ${template.name}`} />
                      </td>
                      <td className="px-6 py-4">
                        <input value={draft.name} onChange={(event) => setDraft(template.id, { name: event.target.value })} onBlur={() => void saveTemplate(template, { name: draft.name })} className="min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{template.description || "暂无简介"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <select value={draft.categoryId} onChange={(event) => { const categoryId = event.target.value; setDraft(template.id, { categoryId }); void saveTemplate(template, { categoryId: categoryId || null }); }} className="min-w-[140px] rounded-xl border border-slate-200 px-3 py-2 text-sm">
                          <option value="">未设置</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <input value={draft.tagsText} onChange={(event) => setDraft(template.id, { tagsText: event.target.value })} onBlur={() => void saveTemplate(template, { tags: splitCommaList(draft.tagsText) })} className="min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <select value={draft.scopeMode} onChange={(event) => { const scopeMode = event.target.value as PromptTemplateScopeMode; setDraft(template.id, { scopeMode }); void saveTemplate(template, { scopeMode, scopeAppCodes: scopeMode === "GLOBAL" ? [] : splitCommaList(draft.scopeAppCodesText) }); }} className="min-w-[140px] rounded-xl border border-slate-200 px-3 py-2 text-sm">
                            <option value="GLOBAL">全站通用</option>
                            <option value="LIMITED">限定应用</option>
                          </select>
                          {draft.scopeMode === "LIMITED" ? (
                            <input value={draft.scopeAppCodesText} onChange={(event) => setDraft(template.id, { scopeAppCodesText: event.target.value })} onBlur={() => void saveTemplate(template, { scopeMode: "LIMITED", scopeAppCodes: splitCommaList(draft.scopeAppCodesText) })} className="min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="app code，逗号分隔" />
                          ) : (
                            <p className="text-xs text-slate-400">{scopeLabel(template)}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                          <input type="checkbox" checked={template.enabled} onChange={(event) => void saveTemplate(template, { enabled: event.target.checked })} />
                          {template.enabled ? "已启用" : "已停用"}
                        </label>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{template.usageCount}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDateTime(template.updatedAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => { setEditingTemplate(template); setEditorOpen(true); }} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
                            编辑
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(template)} disabled={pendingAction === template.id} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-50">
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AdminPromptTemplateEdit
        open={editorOpen}
        template={editingTemplate}
        apps={apps}
        allTags={tags}
        allCategories={categories}
        onTagsChange={setTags}
        onCategoriesChange={setCategories}
        onSaved={(template, isNew) => {
          setTemplates((current) => (isNew ? [template, ...current] : current.map((item) => (item.id === template.id ? template : item))));
          syncDraft(template);
          setMessage(isNew ? "模板已创建。" : "模板已更新。");
          setEditorOpen(false);
          setEditingTemplate(null);
        }}
        onClose={() => {
          setEditorOpen(false);
          setEditingTemplate(null);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除提示词模板"
        description={deleteTarget ? `确定要删除模板 “${deleteTarget.name}” 吗？` : null}
        confirmLabel="确认删除"
        confirmTone="danger"
        pending={deleteTarget ? pendingAction === deleteTarget.id : false}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void handleDeleteTemplate(deleteTarget);
          }
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="批量删除模板"
        description={`确定要删除当前选中的 ${selection.selectedCount} 个模板吗？系统只会移除成功删除的模板记录。`}
        confirmLabel="批量删除"
        confirmTone="danger"
        pending={pendingAction === "delete"}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => {
          setBulkDeleteOpen(false);
          void handleBulkTemplates({ type: "delete" });
        }}
      />

      <FormDialog
        open={bulkCategoryDialogOpen}
        title="批量修改模板分类"
        description={`为当前选中的 ${selection.selectedCount} 个模板设置分类。也可以直接清空分类。`}
        confirmLabel="应用分类"
        pending={pendingAction === "setCategory"}
        onClose={() => setBulkCategoryDialogOpen(false)}
        onSubmit={() => {
          setBulkCategoryDialogOpen(false);
          void handleBulkTemplates({ type: "setCategory", categoryId: bulkCategoryIdInput || null });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">模板分类</span>
          <select value={bulkCategoryIdInput} onChange={(event) => setBulkCategoryIdInput(event.target.value)} className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
            <option value="">清空分类</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </FormDialog>

      <FormDialog
        open={bulkTagsDialogOpen}
        title="批量修改模板标签"
        description={`为当前选中的 ${selection.selectedCount} 个模板设置标签，多个标签请使用逗号分隔。`}
        confirmLabel="应用标签"
        pending={pendingAction === "setTags"}
        onClose={() => setBulkTagsDialogOpen(false)}
        onSubmit={() => {
          setBulkTagsDialogOpen(false);
          void handleBulkTemplates({ type: "setTags", tags: splitCommaList(bulkTagsInput) });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">标签列表</span>
          <textarea value={bulkTagsInput} onChange={(event) => setBulkTagsInput(event.target.value)} className="min-h-28 w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="例如：电商, 商品图, 视频脚本" />
        </label>
      </FormDialog>

      <FormDialog
        open={bulkScopeDialogOpen}
        title="批量修改适用范围"
        description={`为当前选中的 ${selection.selectedCount} 个模板设置适用范围。选择限定应用后，请填写应用 code 列表。`}
        confirmLabel="应用范围"
        pending={pendingAction === "setScope"}
        confirmDisabled={bulkScopeMode === "LIMITED" && splitCommaList(bulkScopeAppsInput).length === 0}
        onClose={() => setBulkScopeDialogOpen(false)}
        onSubmit={() => {
          const scopeAppCodes = bulkScopeMode === "LIMITED" ? splitCommaList(bulkScopeAppsInput) : [];
          if (bulkScopeMode === "LIMITED" && scopeAppCodes.length === 0) {
            setMessage("限定应用范围时必须至少填写一个应用 code。");
            return;
          }

          setBulkScopeDialogOpen(false);
          void handleBulkTemplates({ type: "setScope", scopeMode: bulkScopeMode, scopeAppCodes });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">范围类型</span>
          <select value={bulkScopeMode} onChange={(event) => setBulkScopeMode(event.target.value as PromptTemplateScopeMode)} className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
            <option value="GLOBAL">全站通用</option>
            <option value="LIMITED">限定应用</option>
          </select>
        </label>

        {bulkScopeMode === "LIMITED" ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">应用 code 列表</span>
            <textarea value={bulkScopeAppsInput} onChange={(event) => setBulkScopeAppsInput(event.target.value)} className="min-h-28 w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="例如：image-lab, video-studio" />
          </label>
        ) : null}
      </FormDialog>
    </div>
  );
}
