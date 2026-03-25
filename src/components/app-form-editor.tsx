"use client";

import { useMemo, useState } from "react";

import { AdminBulkToolbar } from "@/components/admin-bulk-toolbar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FeishuSyncMappingEditor } from "@/components/feishu-sync-mapping-editor";
import { ImageLightbox } from "@/components/image-lightbox";
import { useListSelection } from "@/components/use-list-selection";
import { buildConfigFromNodes, parseApiExample, type ParsedNode } from "@/lib/app-parser";
import { extractProviderSubmitOptions } from "@/lib/app-submit";
import type { AppCategoryItem } from "@/lib/db/categories";
import {
  mappingRecordToEntries,
  normalizeFeishuColumnMappings,
  type FeishuColumnMappingEntry,
  type FeishuColumnMappingRecord,
} from "@/lib/feishu-sync-mapping";
import { getAppFeishuSyncFieldOptions, getAppFeishuSyncSourceKeys } from "@/lib/feishu-sync-fields";
import { formatPriceFen } from "@/lib/money";
import { MAX_SHOWCASE_IMAGES } from "@/lib/showcase-images";
import type {
  AppDefinition,
  AppTagRecord,
  InputFieldType,
  RunningHubChannelConfig,
} from "@/lib/types";

interface Props {
  app?: AppDefinition;
  mode: "create" | "edit";
  categories: AppCategoryItem[];
  appTags: AppTagRecord[];
  runninghubChannels?: RunningHubChannelConfig[];
  embedded?: boolean;
  defaultSyncMappingJson?: FeishuColumnMappingRecord;
}

type ProviderParamItem = {
  key: string;
  value: string;
};

type AppEditorTabKey = "basic" | "display" | "api" | "sync";

const FIELD_TYPES: Array<{ label: string; value: InputFieldType }> = [
  { label: "图片", value: "image" },
  { label: "长文本", value: "textarea" },
  { label: "下拉选择", value: "select" },
];

const APP_EDITOR_TABS: Array<{ key: AppEditorTabKey; label: string }> = [
  { key: "basic", label: "基础信息" },
  { key: "display", label: "展示配置" },
  { key: "api", label: "API / 节点配置" },
  { key: "sync", label: "同步配置" },
];

void APP_EDITOR_TABS;

export function slugifyAscii(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateCode(name: string, providerAppId = "", now = Date.now()) {
  const nameCode = slugifyAscii(name);
  if (nameCode) {
    return nameCode;
  }

  const providerCode = slugifyAscii(providerAppId);
  if (providerCode) {
    return providerCode;
  }

  return `app-${now}`;
}

export function buildAdminAppPath(code: string) {
  return `/admin/apps/${encodeURIComponent(code)}`;
}

function parseNodeOptions(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, value] = line.includes(":") ? line.split(/:(.+)/) : [line, line];
      return { label: label.trim(), value: (value ?? label).trim() };
    });
}

function serializeNodeOptions(options: ParsedNode["options"]) {
  return options.map((option) => `${option.label}:${option.value}`).join("\n");
}

function createEmptyNode(index: number): ParsedNode {
  return {
    key: `field${index}`,
    label: `字段 ${index}`,
    type: "textarea",
    nodeId: "",
    fieldName: "",
    defaultValue: "",
    description: "",
    required: false,
    options: [],
    hidden: false,
  };
}

function initialProviderParams(app?: AppDefinition, nodes?: ParsedNode[]) {
  const items = Object.entries(
    extractProviderSubmitOptions(app?.defaultParamsJson ?? {}, (nodes ?? []).map((node) => node.key)),
  ).map(([key, value]) => ({ key, value }));

  return items.length > 0
    ? items
    : [
        { key: "instanceType", value: "default" },
        { key: "usePersonalQueue", value: "false" },
      ];
}

const fieldRowClass = "space-y-2";
const fieldLabelClass = "text-sm font-medium text-slate-700";
const inputClass =
  "w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100";
const textareaClass = `${inputClass} min-h-[120px] resize-y`;
const sectionClass = "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";

type AppTagDraft = {
  name: string;
  color: string;
};

function AppTagManagerModal({
  open,
  tags,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onBulkDelete,
}: {
  open: boolean;
  tags: AppTagRecord[];
  onClose: () => void;
  onCreate: (input: AppTagDraft) => Promise<void>;
  onUpdate: (id: string, input: AppTagDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AppTagDraft>({ name: "", color: "#2563EB" });
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppTagRecord | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const selection = useListSelection(tags);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-2xl font-bold text-slate-950">管理应用标签</h3>
            <p className="mt-2 text-sm text-slate-500">
              标签会同步影响应用编辑器的可选项，也用于后台列表筛选和批量改标签。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
            aria-label="关闭标签管理器"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[320px_minmax(0,1fr)]">
          <section className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-base font-semibold text-slate-950">新增标签</h4>
            <div className="mt-4 space-y-4">
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                className="h-11 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-[#0066DD]"
                placeholder="标签名称"
              />
              <input
                type="color"
                value={draft.color}
                onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
                className="h-11 w-full cursor-pointer rounded-[16px] border border-slate-200 bg-white p-2"
              />
              <button
                type="button"
                disabled={busyId === "create" || !draft.name.trim()}
                onClick={async () => {
                  setBusyId("create");
                  setMessage(null);
                  try {
                    await onCreate(draft);
                    setDraft({ name: "", color: "#2563EB" });
                    setMessage("标签已创建。");
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "创建标签失败。");
                  } finally {
                    setBusyId(null);
                  }
                }}
                className="w-full rounded-full bg-[#0066DD] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                新建标签
              </button>
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <AdminBulkToolbar
              selectedCount={selection.selectedCount}
              label="已选标签"
              onToggleSelectAll={() => selection.toggleSelectAll(tags)}
            >
              <button
                type="button"
                disabled={selection.selectedCount === 0 || busyId !== null}
                onClick={() => setBulkDeleteOpen(true)}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-50"
              >
                批量删除
              </button>
            </AdminBulkToolbar>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {tags.map((tag) => (
                <AppTagManagerRow
                  key={tag.id}
                  tag={tag}
                  checked={selection.selectedIdSet.has(tag.id)}
                  busy={busyId === tag.id}
                  onToggle={() => selection.toggleSelected(tag.id)}
                  onUpdate={async (input) => {
                    setBusyId(tag.id);
                    setMessage(null);
                    try {
                      await onUpdate(tag.id, input);
                      setMessage(`标签已更新：${input.name}`);
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : "更新标签失败。");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  onDelete={async () => {
                    setDeleteTarget(tag);
                  }}
                />
              ))}
              {tags.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                  暂无标签
                </div>
              ) : null}
            </div>

            {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
          </section>
        </div>

        <ConfirmDialog
          open={bulkDeleteOpen}
          title="批量删除应用标签"
          description={`确认删除当前选中的 ${selection.selectedCount} 个标签吗？`}
          confirmLabel="批量删除"
          confirmTone="danger"
          pending={busyId === "bulk-delete"}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={() => {
            void (async () => {
              setBusyId("bulk-delete");
              setMessage(null);
              try {
                await onBulkDelete(selection.selectedIds);
                selection.clearSelection();
                setMessage("标签已批量删除。");
                setBulkDeleteOpen(false);
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "批量删除标签失败。");
              } finally {
                setBusyId(null);
              }
            })();
          }}
        />

        <ConfirmDialog
          open={deleteTarget !== null}
          title="删除应用标签"
          description={
            deleteTarget ? `确认删除标签 ${deleteTarget.name} 吗？删除后会从当前应用的标签选项中移除。` : null
          }
          confirmLabel="确认删除"
          confirmTone="danger"
          pending={deleteTarget ? busyId === deleteTarget.id : false}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (!deleteTarget) {
              return;
            }

            void (async () => {
              setBusyId(deleteTarget.id);
              setMessage(null);
              try {
                await onDelete(deleteTarget.id);
                setMessage(`标签已删除：${deleteTarget.name}`);
                setDeleteTarget(null);
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "删除标签失败。");
              } finally {
                setBusyId(null);
              }
            })();
          }}
        />
      </div>
    </div>
  );
}

function AppTagManagerRow({
  tag,
  checked,
  busy,
  onToggle,
  onUpdate,
  onDelete,
}: {
  tag: AppTagRecord;
  checked: boolean;
  busy: boolean;
  onToggle: () => void;
  onUpdate: (input: AppTagDraft) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AppTagDraft>({ name: tag.name, color: tag.color });

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-3">
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                className="h-10 w-full rounded-[12px] border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#0066DD]"
              />
              <input
                type="color"
                value={draft.color}
                onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
                className="h-10 w-full cursor-pointer rounded-[12px] border border-slate-200 p-1"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    await onUpdate({ name: draft.name.trim(), color: draft.color });
                    setEditing(false);
                  }}
                  className="rounded-full bg-[#0066DD] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft({ name: tag.name, color: tag.color });
                    setEditing(false);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">{tag.name}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span>{tag.color}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete()}
                  disabled={busy}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-600 disabled:opacity-60"
                >
                  删除
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppFormEditor({
  app,
  mode,
  categories,
  appTags,
  runninghubChannels = [],
  embedded = false,
  defaultSyncMappingJson = {},
}: Props) {
  const initialNodes = useMemo(
    () => (app?.nodes && app.nodes.length > 0 ? app.nodes : [createEmptyNode(1)]),
    [app?.nodes],
  );

  const [code, setCode] = useState(app?.code ?? "");
  const [codeEdited, setCodeEdited] = useState(mode === "edit");
  const [name, setName] = useState(app?.name ?? "");
  const [description, setDescription] = useState(app?.description ?? "");
  const [providerAppId, setProviderAppId] = useState(app?.providerAppId ?? "");
  const [runninghubMode, setRunninghubMode] = useState(
    app?.runninghubAllowedChannelCodesJson?.length ? "restricted" : "auto",
  );
  const [allowedRunninghubChannels, setAllowedRunninghubChannels] = useState<string[]>(
    app?.runninghubAllowedChannelCodesJson ?? [],
  );
  const [enabled, setEnabled] = useState(app?.enabled ?? true);
  const [shareResults, setShareResults] = useState(app?.shareResults ?? false);
  const [estimatedPriceYuan, setEstimatedPriceYuan] = useState(
    app ? formatPriceFen(app.estimatedPriceFen).replace("¥", "") : "0.00",
  );
  const [category, setCategory] = useState(app?.category ?? categories[0]?.name ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(app?.tags ?? []);
  const [tagOptions, setTagOptions] = useState(appTags);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#2563EB");
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  const [coverPoster, setCoverPoster] = useState(app?.coverPoster ?? "");
  const [showcaseImages, setShowcaseImages] = useState<string[]>(app?.showcaseImages ?? []);
  const [showcaseUrlInput, setShowcaseUrlInput] = useState("");
  const [sortOrder, setSortOrder] = useState(String(app?.sortOrder ?? 0));
  const [viewCount, setViewCount] = useState(String(app?.viewCount ?? 0));

  const [nodes, setNodes] = useState<ParsedNode[]>(initialNodes);
  const [providerParams, setProviderParams] = useState<ProviderParamItem[]>(
    initialProviderParams(app, initialNodes),
  );
  const [syncMappingEntries, setSyncMappingEntries] = useState<FeishuColumnMappingEntry[]>(
    mappingRecordToEntries(
      normalizeFeishuColumnMappings(app?.syncMappingJson ?? defaultSyncMappingJson),
    ),
  );
  const syncFieldOptions = useMemo(
    () =>
      getAppFeishuSyncFieldOptions(
        nodes.map((node) => ({
          key: node.key,
          label: node.label,
          type: node.type,
        })),
      ),
    [nodes],
  );

  const [parseInput, setParseInput] = useState("");
  const [showParseModal, setShowParseModal] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [showcaseUploading, setShowcaseUploading] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<{ id: string; name: string; url: string } | null>(null);
  const [activeTab, setActiveTab] = useState<AppEditorTabKey>("basic");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (mode === "create" && !codeEdited) {
      setCode(generateCode(value, providerAppId));
    }
  }

  function handleCodeChange(value: string) {
    setCode(value);
    if (mode === "create") {
      setCodeEdited(true);
    }
  }

  function handleProviderAppIdChange(value: string) {
    setProviderAppId(value);
    if (mode === "create" && !codeEdited) {
      setCode(generateCode(name, value));
    }
  }

  function updateNode(index: number, patch: Partial<ParsedNode>) {
    setNodes((current) =>
      current.map((node, nodeIndex) => (nodeIndex === index ? { ...node, ...patch } : node)),
    );
  }

  function updateProviderParam(index: number, patch: Partial<ProviderParamItem>) {
    setProviderParams((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function toggleTag(tagName: string) {
    setSelectedTags((current) =>
      current.includes(tagName) ? current.filter((item) => item !== tagName) : [...current, tagName],
    );
  }

  async function handleCreateTag(input?: AppTagDraft) {
    const nameValue = (input?.name ?? newTagName).trim();
    const colorValue = input?.color ?? newTagColor;
    if (!nameValue) {
      return;
    }

    try {
      const response = await fetch("/api/internal/admin/app-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue, color: colorValue }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "创建标签失败");
      }

      const nextTag = data.item as AppTagRecord;
      setTagOptions((current) =>
        [...current, nextTag].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "zh-CN"),
        ),
      );
      setSelectedTags((current) =>
        current.includes(nextTag.name) ? current : [...current, nextTag.name],
      );
      if (!input) {
        setNewTagName("");
      }
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : "创建标签失败");
    }
  }

  async function handleUpdateTag(tagId: string, input: AppTagDraft) {
    const previousName = tagOptions.find((tag) => tag.id === tagId)?.name;
    if (!previousName) {
      return;
    }

    try {
      const response = await fetch(`/api/internal/admin/app-tags/${tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: input.name.trim(), color: input.color }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "更新标签失败");
      }

      const nextTag = data.item as AppTagRecord;
      setTagOptions((current) =>
        current
          .map((item) => (item.id === tagId ? nextTag : item))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "zh-CN")),
      );
      setSelectedTags((current) => current.map((item) => (item === previousName ? nextTag.name : item)));
    } catch (tagError) {
      throw new Error(tagError instanceof Error ? tagError.message : "更新标签失败");
    }
  }

  async function handleDeleteTag(tagId: string) {
    const target = tagOptions.find((tag) => tag.id === tagId);
    if (!target) {
      return;
    }

    try {
      const response = await fetch(`/api/internal/admin/app-tags/${tagId}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "删除标签失败");
      }

      setTagOptions((current) => current.filter((item) => item.id !== tagId));
      setSelectedTags((current) => current.filter((item) => item !== target.name));
    } catch (tagError) {
      throw new Error(tagError instanceof Error ? tagError.message : "删除标签失败");
    }
  }

  async function handleBulkDeleteTags(tagIds: string[]) {
    const removedNames = tagOptions.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name);

    try {
      const response = await fetch("/api/internal/admin/app-tags/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: tagIds, action: { type: "delete" } }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "批量删除标签失败");
      }

      setTagOptions((current) => current.filter((item) => !tagIds.includes(item.id)));
      setSelectedTags((current) => current.filter((item) => !removedNames.includes(item)));
    } catch (tagError) {
      throw new Error(tagError instanceof Error ? tagError.message : "批量删除标签失败");
    }
  }

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/internal/upload", { method: "POST", body: formData });
    const data = await response.json().catch(() => null);

    if (!response.ok || typeof data?.url !== "string") {
      throw new Error(data?.error ?? "图片上传失败");
    }

    return data.url;
  }

  async function handleCoverUpload(file: File) {
    setCoverUploading(true);
    setError(null);

    try {
      setCoverPoster(await uploadImage(file));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "封面上传失败");
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleShowcaseUpload(files: FileList | File[]) {
    const nextFiles = Array.from(files).slice(0, Math.max(0, MAX_SHOWCASE_IMAGES - showcaseImages.length));
    if (nextFiles.length === 0) {
      return;
    }

    setShowcaseUploading(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];
      for (const file of nextFiles) {
        uploadedUrls.push(await uploadImage(file));
      }

      setShowcaseImages((current) => [...current, ...uploadedUrls].slice(0, MAX_SHOWCASE_IMAGES));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "案例图上传失败");
    } finally {
      setShowcaseUploading(false);
    }
  }

  function handleAddShowcaseUrl() {
    const value = showcaseUrlInput.trim();
    if (!value) {
      return;
    }

    setShowcaseImages((current) => {
      if (current.length >= 6 || current.includes(value)) {
        return current;
      }

      return [...current, value];
    });
    setShowcaseUrlInput("");
  }

  function moveShowcaseImage(index: number, direction: -1 | 1) {
    setShowcaseImages((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function setShowcasePrimary(index: number) {
    setShowcaseImages((current) => {
      if (index <= 0 || index >= current.length) {
        return current;
      }

      const next = [...current];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
      return next;
    });
  }

  function removeShowcaseImage(index: number) {
    setShowcaseImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleDelete() {
    if (!app?.code) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/internal/admin/apps/${encodeURIComponent(app.code)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "删除失败");
      }

      setDeleteConfirmOpen(false);
      window.location.href = "/admin/apps";
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function handleParseApiExample() {
    setParseError(null);

    try {
      const result = parseApiExample(parseInput);
      if (result.providerAppId) {
        handleProviderAppIdChange(result.providerAppId);
      }
      setNodes(result.nodes.length > 0 ? result.nodes : [createEmptyNode(1)]);
      setProviderParams(
        Object.entries(result.extraParams).map(([key, value]) => ({ key, value })),
      );
      setShowParseModal(false);
      setParseInput("");
      setSuccess("已根据 API 示例自动生成应用 ID、节点配置和顶层参数。");
      setActiveTab("api");
    } catch (parseValueError) {
      setParseError(parseValueError instanceof Error ? parseValueError.message : "解析失败");
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!code.trim()) throw new Error("应用标识不能为空");
      if (!name.trim()) throw new Error("应用名称不能为空");
      if (!providerAppId.trim()) throw new Error("应用 ID 不能为空");

      const extraParams = providerParams.reduce<Record<string, string>>((acc, item) => {
        const key = item.key.trim();
        const value = item.value.trim();
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {});

      const config = buildConfigFromNodes(nodes, extraParams);

      const parsedSyncMapping = normalizeFeishuColumnMappings(syncMappingEntries, {
        allowedSourceKeys: getAppFeishuSyncSourceKeys(config.formSchemaJson),
      });

      const payload = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        providerAppId: providerAppId.trim(),
        enabled,
        shareResults,
        estimatedPriceYuan: estimatedPriceYuan.trim(),
        category: category || null,
        tags: selectedTags,
        formSchemaJson: config.formSchemaJson,
        requestMappingJson: config.requestMappingJson,
        defaultParamsJson: config.defaultParamsJson,
        syncMappingJson: parsedSyncMapping,
        runninghubAllowedChannelCodesJson:
          runninghubMode === "restricted" ? allowedRunninghubChannels : null,
        coverPoster: coverPoster.trim() || null,
        showcaseImages,
        sortOrder: Number(sortOrder || 0),
        viewCount: Number(viewCount || 0),
      };

      const response = await fetch(
        mode === "create"
          ? "/api/internal/admin/apps"
          : `/api/internal/admin/apps/${encodeURIComponent(app?.code ?? "")}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "保存失败");
      }

      if (mode === "create") {
        const nextCode =
          typeof data?.app?.code === "string" && data.app.code.trim()
            ? data.app.code.trim()
            : code.trim();
        window.location.href = buildAdminAppPath(nextCode);
        return;
      }

      setSuccess("应用配置已保存。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className={`flex flex-wrap items-center gap-4 ${embedded ? "justify-end" : "justify-between"}`}>
        {!embedded ? (
          <div>
          <p className="text-sm font-medium text-[#0066DD]">应用配置</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            {mode === "create" ? "新建应用" : `编辑 ${app?.name ?? "应用"}`}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            使用多标签页维护应用的基础信息、展示配置、API 节点和同步配置。
          </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/admin/apps";
            }}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            取消
          </button>
          {mode === "edit" ? (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting}
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 disabled:opacity-60"
            >
              {deleting ? "删除中..." : "删除应用"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "保存中..." : "保存配置"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "basic" as const, label: "基础信息与展示", testId: "app-editor-tab-details" },
            { key: "api" as const, label: "节点与同步", testId: "app-editor-tab-nodes" },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                data-testid={tab.testId}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#0066DD] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span data-testid="app-editor-tab">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "basic" ? (
        <section className={sectionClass}>
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-950">基础信息</h2>
            <p className="mt-1 text-sm text-slate-500">
              管理应用标识、应用 ID、分类、标签和启用状态。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>应用标识</label>
              <input
                data-testid="app-code-input"
                value={code}
                onChange={(event) => handleCodeChange(event.target.value)}
                disabled={mode === "edit"}
                className={`${inputClass} disabled:opacity-60`}
              />
            </div>
            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>应用名称</label>
              <input
                data-testid="app-name-input"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                className={inputClass}
              />
            </div>
            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>应用 ID</label>
              <input
                data-testid="app-provider-app-id-input"
                value={providerAppId}
                onChange={(event) => handleProviderAppIdChange(event.target.value)}
                className={inputClass}
              />
            </div>
            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>应用分类</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              >
                <option value="">未分类</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className={fieldLabelClass}>应用描述</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={textareaClass}
            />
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              启用应用
            </label>
          </div>

          <div className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={shareResults}
                onChange={(event) => setShareResults(event.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-slate-800">开启结果共享</span>
                <span className="mt-1 block text-xs text-slate-500">
                  开启后，普通用户可以查看这个应用的共享成功结果，但不会看到创建者、输入内容和后台归档信息。
                </span>
              </span>
            </label>
          </div>

          <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-slate-800">RunningHub 通道</span>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  checked={runninghubMode === "auto"}
                  onChange={() => setRunninghubMode("auto")}
                />
                自动调度
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  checked={runninghubMode === "restricted"}
                  onChange={() => setRunninghubMode("restricted")}
                />
                指定通道
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              自动模式会按全局优先级链路派发；指定通道后，只会在你勾选的通道里排队和抢占并发。
            </p>
            {runninghubMode === "restricted" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {runninghubChannels.map((channel) => {
                  const active = allowedRunninghubChannels.includes(channel.code);
                  return (
                    <button
                      key={channel.code}
                      type="button"
                      onClick={() =>
                        setAllowedRunninghubChannels((current) =>
                          current.includes(channel.code)
                            ? current.filter((code) => code !== channel.code)
                            : [...current, channel.code],
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        active
                          ? "border-transparent bg-[#0066DD] text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {channel.name}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold text-slate-950">应用标签</h3>
            <p className="mt-1 text-sm text-slate-500">可复用标签，用于后台筛选和长期管理。</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">可直接点选，也可以进入标签管理器统一维护。</span>
              <button
                type="button"
                onClick={() => setTagManagerOpen(true)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                管理标签
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tagOptions.map((tag) => {
                const active = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      active
                        ? "border-transparent text-white"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                    style={active ? { backgroundColor: tag.color } : undefined}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_auto]">
              <input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                className={inputClass}
                placeholder="输入新标签名称"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(event) => setNewTagColor(event.target.value)}
                className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-2"
              />
              <button
                type="button"
                onClick={() => void handleCreateTag()}
                className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              >
                新建标签
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "basic" ? (
        <section className={sectionClass}>
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-950">展示配置</h2>
            <p className="mt-1 text-sm text-slate-500">
              保留封面图作为主视觉，并补充案例参考图片，供前台详情页展示效果。
            </p>
          </div>
          <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                {coverPoster ? (
                  <button
                    type="button"
                    aria-label="preview-app-cover"
                    onClick={() =>
                      setPreviewAsset({
                        id: "cover",
                        name: name || code || "cover",
                        url: coverPoster,
                      })
                    }
                    className="flex h-48 w-full items-center justify-center p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverPoster} alt="封面预览" className="h-full w-full object-contain" />
                  </button>
                ) : (
                  <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                    暂无封面图
                  </div>
                )}
                <div className="border-t border-slate-200 p-4">
                  <label className={fieldLabelClass}>封面图片上传</label>
                  <label className="mt-2 flex cursor-pointer items-center justify-center rounded-[16px] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    {coverUploading ? "上传中..." : "选择本地图片"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={coverUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleCoverUpload(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
              <div className={fieldRowClass}>
                <label className={fieldLabelClass}>封面图 URL</label>
                <input value={coverPoster} onChange={(event) => setCoverPoster(event.target.value)} className={inputClass} />
              </div>
              <div className={fieldRowClass}>
                <label className={fieldLabelClass}>预计费用（元）</label>
                <input
                  value={estimatedPriceYuan}
                  onChange={(event) => setEstimatedPriceYuan(event.target.value)}
                  className={inputClass}
                  placeholder="例如 12.50"
                />
              </div>
              <div className={fieldRowClass}>
                <label className={fieldLabelClass}>排序值</label>
                <input value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className={inputClass} />
              </div>
              <div className={fieldRowClass}>
                <label className={fieldLabelClass}>初始浏览量</label>
                <input value={viewCount} onChange={(event) => setViewCount(event.target.value)} className={inputClass} />
              </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">案例参考图片</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      前台详情页会展示这些图片，最多 {MAX_SHOWCASE_IMAGES} 张，按当前顺序显示。
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                    {showcaseImages.length}/{MAX_SHOWCASE_IMAGES}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    data-testid="showcase-image-url-input"
                    value={showcaseUrlInput}
                    onChange={(event) => setShowcaseUrlInput(event.target.value)}
                    className={inputClass}
                    placeholder="输入案例图片 URL"
                  />
                  <button
                    type="button"
                    data-testid="showcase-image-url-add"
                    onClick={handleAddShowcaseUrl}
                    className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    添加图片 URL
                  </button>
                </div>

                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-[16px] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                  {showcaseUploading ? "上传中..." : "批量上传案例图片"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={showcaseUploading || showcaseImages.length >= MAX_SHOWCASE_IMAGES}
                    onChange={(event) => {
                      if (event.target.files?.length) {
                        void handleShowcaseUpload(event.target.files);
                      }
                    }}
                  />
                </label>

                {showcaseImages.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {showcaseImages.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index}`}
                        className="overflow-hidden rounded-[20px] border border-slate-200 bg-white"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewAsset({
                              id: `showcase-${index}`,
                              name: `${name || code || "showcase"}-${index + 1}`,
                              url: imageUrl,
                            })
                          }
                          className="flex aspect-[4/3] w-full items-center justify-center bg-slate-50 p-3"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrl} alt={`案例图 ${index + 1}`} className="h-full w-full object-contain" />
                        </button>
                        <div className="space-y-2 border-t border-slate-200 p-3">
                          <p className="text-xs font-medium text-slate-500">案例图 {index + 1}</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setShowcasePrimary(index)}
                              disabled={index === 0}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                            >
                              设为首图
                            </button>
                            <button
                              type="button"
                              onClick={() => moveShowcaseImage(index, -1)}
                              disabled={index === 0}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                            >
                              左移
                            </button>
                            <button
                              type="button"
                              onClick={() => moveShowcaseImage(index, 1)}
                              disabled={index === showcaseImages.length - 1}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                            >
                              右移
                            </button>
                            <button
                              type="button"
                              onClick={() => removeShowcaseImage(index)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[18px] border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-400">
                    暂无案例图，前台将回退显示封面图。
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "api" ? (
        <section className={sectionClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">API / 节点配置</h2>
              <p className="mt-1 text-sm text-slate-500">
                支持从 RunningHub curl 或 JSON 自动导入应用 ID、节点列表和顶层参数。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowParseModal(true)}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700"
              >
                从 API 示例导入
              </button>
              <button
                type="button"
                onClick={() => setNodes((current) => [...current, createEmptyNode(current.length + 1)])}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                新增节点
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">顶层参数</h3>
                <p className="mt-1 text-sm text-slate-500">
                  例如 `instanceType`、`usePersonalQueue`。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProviderParams((current) => [...current, { key: "", value: "" }])}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                新增参数
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {providerParams.map((item, index) => (
                <div key={`${item.key}-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>参数名称</label>
                    <input value={item.key} onChange={(event) => updateProviderParam(index, { key: event.target.value })} className={inputClass} />
                  </div>
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>参数值</label>
                    <input value={item.value} onChange={(event) => updateProviderParam(index, { value: event.target.value })} className={inputClass} />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => setProviderParams((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {nodes.map((node, index) => (
              <div key={`${node.key}-${index}`} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">节点 {index + 1}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      结构化维护 key、label、type、nodeId、fieldName、默认值和选项。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNodes((current) => current.filter((_, nodeIndex) => nodeIndex !== index))}
                    disabled={nodes.length === 1}
                    className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 disabled:opacity-40"
                  >
                    删除节点
                  </button>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>字段 key</label>
                    <input value={node.key} onChange={(event) => updateNode(index, { key: event.target.value })} className={inputClass} />
                  </div>
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>显示名称</label>
                    <input value={node.label} onChange={(event) => updateNode(index, { label: event.target.value })} className={inputClass} />
                  </div>
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>字段类型</label>
                    <select value={node.type} onChange={(event) => updateNode(index, { type: event.target.value as InputFieldType })} className={inputClass}>
                      {FIELD_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>节点 ID</label>
                    <input value={node.nodeId} onChange={(event) => updateNode(index, { nodeId: event.target.value })} className={inputClass} />
                  </div>
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>字段名称</label>
                    <input value={node.fieldName} onChange={(event) => updateNode(index, { fieldName: event.target.value })} className={inputClass} />
                  </div>
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>默认值</label>
                    <input value={node.defaultValue} onChange={(event) => updateNode(index, { defaultValue: event.target.value })} className={inputClass} />
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>描述说明</label>
                    <textarea value={node.description} onChange={(event) => updateNode(index, { description: event.target.value })} className={textareaClass} />
                  </div>
                  <div className="space-y-4">
                    <div className={fieldRowClass}>
                      <label className={fieldLabelClass}>是否必填</label>
                      <label className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <input type="checkbox" checked={node.required} onChange={(event) => updateNode(index, { required: event.target.checked })} />
                        该字段必填
                      </label>
                    </div>
                    <div className={fieldRowClass}>
                      <label className={fieldLabelClass}>前台显示</label>
                      <label className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <input
                          data-testid={`node-hidden-toggle-${index}`}
                          type="checkbox"
                          checked={Boolean(node.hidden)}
                          onChange={(event) => updateNode(index, { hidden: event.target.checked })}
                        />
                        {node.hidden ? "前台隐藏" : "前台显示"}
                      </label>
                      <p className="text-xs text-slate-400">
                        {node.hidden
                          ? node.defaultValue
                            ? "前台隐藏，提交时会自动使用默认值。"
                            : "前台隐藏，本次提交将按空值发送。"
                          : "字段会展示在前台表单中。"}
                      </p>
                    </div>
                    <div className={fieldRowClass}>
                      <label className={fieldLabelClass}>选项配置</label>
                      <textarea value={serializeNodeOptions(node.options)} onChange={(event) => updateNode(index, { options: parseNodeOptions(event.target.value) })} className={textareaClass} />
                      <p className="text-xs text-slate-400">每行一个选项，格式为 `显示名:值`。</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "api" ? (
        <section className={sectionClass}>
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-950">同步配置</h2>
            <p className="mt-1 text-sm text-slate-500">
              共享基础字段会继承站点默认映射，当前应用还可以追加自己的表单参数字段覆盖飞书列。
            </p>
          </div>
          <div data-testid="app-sync-mapping-input">
            <FeishuSyncMappingEditor
              entries={syncMappingEntries}
              options={syncFieldOptions}
              onChange={setSyncMappingEntries}
              emptyState="这里会把共享基础字段和当前应用的表单字段一起暴露为可选源字段。"
              addLabel="添加映射"
              testIdPrefix="app-sync-mapping"
            />
          </div>
        </section>
      ) : null}

      {showParseModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-4xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-950">从 API 示例导入</h3>
                <p className="mt-2 text-sm text-slate-500">
                  粘贴 curl 或 JSON，系统会自动解析应用 ID、节点列表和顶层参数。
                </p>
              </div>
              <button type="button" onClick={() => setShowParseModal(false)} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500">
                关闭
              </button>
            </div>
            <textarea
              value={parseInput}
              onChange={(event) => {
                setParseInput(event.target.value);
                setParseError(null);
              }}
              rows={16}
              className="mt-4 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-sm outline-none focus:border-[#0066DD]"
            />
            {parseError ? (
              <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {parseError}
              </div>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowParseModal(false)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">
                取消
              </button>
              <button type="button" onClick={handleParseApiExample} className="rounded-full bg-[#0066DD] px-4 py-2 text-sm font-semibold text-white">
                解析并填充
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewAsset ? (
        <ImageLightbox
          assets={[previewAsset]}
          onClose={() => setPreviewAsset(null)}
        />
      ) : null}

      <AppTagManagerModal
        open={tagManagerOpen}
        tags={tagOptions}
        onClose={() => setTagManagerOpen(false)}
        onCreate={handleCreateTag}
        onUpdate={handleUpdateTag}
        onDelete={handleDeleteTag}
        onBulkDelete={handleBulkDeleteTags}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="删除应用"
        description={app ? `确定要删除应用《${app.name}》吗？此操作不可恢复。` : null}
        confirmLabel="确认删除"
        confirmTone="danger"
        pending={deleting}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </div>
  );
}

