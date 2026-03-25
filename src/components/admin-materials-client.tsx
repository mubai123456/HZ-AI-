"use client";

import { useEffect, useMemo, useState } from "react";
import type { DragEvent, ReactNode } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import type {
  AdminMaterialClaimLogRecord,
  AdminMaterialItem,
  MaterialStatus,
  MaterialTagRecord,
} from "@/lib/types";

type UploadQueueStatus = "pending" | "uploading" | "created" | "skipped_duplicate" | "failed";
type AdminTabKey = "materials" | "claims";

type UploadQueueItem = {
  id: string;
  file: File;
  title: string;
  extension: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  previewSupported: boolean;
  status: UploadQueueStatus;
  error: string | null;
};

type UploadDraft = {
  batchNo: string;
  description: string;
  selectedTags: string[];
  newTagInput: string;
};

type EditDraft = {
  title: string;
  description: string;
  batchNo: string;
  status: MaterialStatus;
  tags: string[];
  newTagInput: string;
};

type UploadApiResult = {
  fileName: string;
  status: "created" | "skipped_duplicate" | "failed";
  message: string;
  item?: AdminMaterialItem;
};

const SUPPORTED_VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "webm", "avi", "mkv"];
const DIRECT_PREVIEW_EXTENSIONS = ["mp4", "mov", "m4v", "webm"];
const VIDEO_ACCEPT = ".mp4,.mov,.m4v,.webm,.avi,.mkv,video/*";

const MATERIAL_STATUS_OPTIONS: Array<{ value: MaterialStatus; label: string }> = [
  { value: "UPLOADING", label: "上传中" },
  { value: "PROCESSING", label: "处理中" },
  { value: "AVAILABLE", label: "已上架" },
  { value: "CLAIMED", label: "已领取" },
  { value: "OFF_SHELF", label: "已下架" },
  { value: "ARCHIVED", label: "已归档" },
];

function splitTags(input: string) {
  return input
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueTags(tags: string[]) {
  return Array.from(new Set(tags.map((item) => item.trim()).filter(Boolean)));
}

function getFileExtension(filename: string) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

function formatDuration(durationMs: number | null) {
  if (!durationMs) {
    return "待识别";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDimensions(width: number | null, height: number | null) {
  if (!width || !height) {
    return "待识别";
  }
  return `${width} x ${height}`;
}

function getMaterialStatusLabel(status: MaterialStatus) {
  return MATERIAL_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function getClaimStatusLabel(status: AdminMaterialClaimLogRecord["status"]) {
  switch (status) {
    case "ACTIVE":
      return "已领取";
    case "RESET_BY_ADMIN":
      return "已重置";
    case "DELIVERY_FAILED":
      return "发放失败";
    default:
      return status;
  }
}

function getQueueStatusLabel(status: UploadQueueStatus) {
  switch (status) {
    case "pending":
      return "待上传";
    case "uploading":
      return "上传中";
    case "created":
      return "上传成功";
    case "skipped_duplicate":
      return "重复素材，已跳过";
    case "failed":
      return "上传失败";
    default:
      return status;
  }
}

function toggleTag(list: string[], tag: string) {
  return list.includes(tag) ? list.filter((item) => item !== tag) : [...list, tag];
}

function badgeClass(active: boolean) {
  return active
    ? "border-[#0066DD] bg-[#EAF2FF] text-[#0066DD]"
    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700";
}

async function extractVideoMetadata(file: File) {
  return new Promise<{ width: number | null; height: number | null; durationMs: number | null }>((resolve) => {
    const extension = getFileExtension(file.name);
    if (!DIRECT_PREVIEW_EXTENSIONS.includes(extension)) {
      resolve({ width: null, height: null, durationMs: null });
      return;
    }

    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const durationMs = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null;
      resolve({
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        durationMs,
      });
      URL.revokeObjectURL(objectUrl);
    };

    video.onerror = () => {
      resolve({ width: null, height: null, durationMs: null });
      URL.revokeObjectURL(objectUrl);
    };

    video.src = objectUrl;
  });
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? "请求失败。");
  }
  return data as T;
}

function buildQueueMetadata(item: UploadQueueItem) {
  return [
    {
      name: item.file.name,
      title: item.title.trim(),
      width: item.width,
      height: item.height,
      durationMs: item.durationMs,
      extension: item.extension,
      previewSupported: item.previewSupported,
    },
  ];
}

function Modal({
  title,
  description,
  onClose,
  children,
  widthClass = "max-w-6xl",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div
        className={`max-h-[90vh] w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl ${widthClass}`}
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-2xl font-bold text-slate-950">{title}</h3>
            {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            关闭
          </button>
        </div>
        <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[28px] border border-slate-200 bg-white p-6 ${className}`}>{children}</section>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function Drawer({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm" onClick={onClose}>
      <div
        className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-2xl font-bold text-slate-950">{title}</h3>
            {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            关闭
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function AdminMaterialsClient({
  initialMaterials,
  initialClaims,
}: {
  initialMaterials: AdminMaterialItem[];
  initialClaims: AdminMaterialClaimLogRecord[];
}) {
  const [activeTab, setActiveTab] = useState<AdminTabKey>("materials");
  const [materials, setMaterials] = useState(initialMaterials);
  const [claims, setClaims] = useState(initialClaims);
  const [tags, setTags] = useState<MaterialTagRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null);
  const [renameTagInput, setRenameTagInput] = useState("");
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>({
    batchNo: "",
    description: "",
    selectedTags: [],
    newTagInput: "",
  });

  const [editingMaterial, setEditingMaterial] = useState<AdminMaterialItem | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({
    title: "",
    description: "",
    batchNo: "",
    status: "AVAILABLE",
    tags: [],
    newTagInput: "",
  });

  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [batchTagOpen, setBatchTagOpen] = useState(false);
  const [batchTagDraft, setBatchTagDraft] = useState<string[]>([]);
  const [batchTagInput, setBatchTagInput] = useState("");
  const [deleteTagTarget, setDeleteTagTarget] = useState<MaterialTagRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<{ materialId: string; title: string } | null>(null);
  const [resetReasonInput, setResetReasonInput] = useState("运营回收");
  const [deleteMaterialTarget, setDeleteMaterialTarget] = useState<{ materialId: string; title: string } | null>(null);
  const [bulkResetOpen, setBulkResetOpen] = useState(false);
  const [bulkResetReasonInput, setBulkResetReasonInput] = useState("运营批量回收");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [materialKeyword, setMaterialKeyword] = useState("");
  const [materialTagFilter, setMaterialTagFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [claimStatusFilter, setClaimStatusFilter] = useState("ALL");
  const [materialStatusFilter, setMaterialStatusFilter] = useState("ALL");
  const [claimKeyword, setClaimKeyword] = useState("");
  const [claimOwnerFilter, setClaimOwnerFilter] = useState("ALL");
  const [claimLogStatusFilter, setClaimLogStatusFilter] = useState("ALL");

  async function refreshTags() {
    const data = await requestJson<{ items: MaterialTagRecord[] }>("/api/internal/admin/material-tags");
    setTags(Array.isArray(data.items) ? data.items : []);
  }

  async function refreshMaterials() {
    const data = await requestJson<{ items: AdminMaterialItem[] }>("/api/internal/admin/materials");
    setMaterials(Array.isArray(data.items) ? data.items : []);
  }

  async function refreshClaims() {
    const data = await requestJson<{ items: AdminMaterialClaimLogRecord[] }>("/api/internal/admin/claims");
    setClaims(Array.isArray(data.items) ? data.items : []);
  }

  async function refreshAll() {
    setLoadingData(true);
    try {
      await Promise.all([refreshMaterials(), refreshClaims(), refreshTags()]);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    void refreshTags().catch(() => setTags([]));
  }, []);

  useEffect(() => {
    setSelectedMaterialIds((current) => current.filter((id) => materials.some((item) => item.id === id)));
  }, [materials]);

  const claimOwnerOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    for (const item of claims) {
      const key = item.ownerId ?? item.username;
      if (!map.has(key)) {
        map.set(key, {
          value: key,
          label: `${item.displayName}（${item.username}）`,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
  }, [claims]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      const keyword = materialKeyword.trim();
      const matchesKeyword =
        !keyword ||
        item.title.includes(keyword) ||
        item.sourceFilename.includes(keyword) ||
        (item.batchNo ?? "").includes(keyword);
      const matchesTag = materialTagFilter === "ALL" || item.tags.includes(materialTagFilter);
      const matchesOwner = !ownerFilter.trim() || (item.exclusiveOwnerName ?? "").includes(ownerFilter.trim());
      const matchesClaimStatus =
        claimStatusFilter === "ALL" ||
        (claimStatusFilter === "CLAIMED" ? Boolean(item.activeClaimId) : !item.activeClaimId);
      const matchesMaterialStatus = materialStatusFilter === "ALL" || item.status === materialStatusFilter;
      return matchesKeyword && matchesTag && matchesOwner && matchesClaimStatus && matchesMaterialStatus;
    });
  }, [materials, materialKeyword, materialTagFilter, ownerFilter, claimStatusFilter, materialStatusFilter]);

  const filteredClaims = useMemo(() => {
    return claims.filter((item) => {
      const keyword = claimKeyword.trim();
      const matchesKeyword =
        !keyword ||
        item.materialTitle.includes(keyword) ||
        item.displayName.includes(keyword) ||
        item.username.includes(keyword);
      const matchesOwner = claimOwnerFilter === "ALL" || (item.ownerId ?? item.username) === claimOwnerFilter;
      const matchesStatus = claimLogStatusFilter === "ALL" || item.status === claimLogStatusFilter;
      return matchesKeyword && matchesOwner && matchesStatus;
    });
  }, [claims, claimKeyword, claimOwnerFilter, claimLogStatusFilter]);

  const allFilteredSelected =
    filteredMaterials.length > 0 && filteredMaterials.every((item) => selectedMaterialIds.includes(item.id));

  async function appendFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter((file) => {
      const extension = getFileExtension(file.name);
      return file.type.startsWith("video/") || SUPPORTED_VIDEO_EXTENSIONS.includes(extension);
    });

    if (incoming.length === 0) {
      setMessage("请选择支持的视频格式：mp4、mov、m4v、webm、avi、mkv。");
      return;
    }

    const items = await Promise.all(
      incoming.map(async (file) => {
        const extension = getFileExtension(file.name);
        const metadata = await extractVideoMetadata(file);
        return {
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
          file,
          title: file.name.replace(/\.[^.]+$/, ""),
          extension,
          width: metadata.width,
          height: metadata.height,
          durationMs: metadata.durationMs,
          previewSupported: DIRECT_PREVIEW_EXTENSIONS.includes(extension),
          status: "pending" as UploadQueueStatus,
          error: null,
        };
      }),
    );

    setQueue((current) => [...current, ...items]);
    setMessage(null);
  }

  async function handleCreateTag() {
    const inputTags = uniqueTags(splitTags(uploadDraft.newTagInput));
    if (inputTags.length === 0) {
      setMessage("请先输入要新增的标签。");
      return;
    }

    setCreatingTag(true);
    setMessage(null);

    try {
      const created: MaterialTagRecord[] = [];
      for (const tagName of inputTags) {
        const existing = tags.find((item) => item.name === tagName);
        if (existing) {
          created.push(existing);
          continue;
        }

        const data = await requestJson<{ item: MaterialTagRecord }>("/api/internal/admin/material-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: tagName }),
        });
        created.push(data.item);
      }

      setTags((current) => {
        const merged = new Map(current.map((item) => [item.id, item]));
        created.forEach((item) => merged.set(item.id, item));
        return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
      });
      setUploadDraft((current) => ({
        ...current,
        selectedTags: uniqueTags([...current.selectedTags, ...created.map((item) => item.name)]),
        newTagInput: "",
      }));
      setMessage(`标签库已更新：${created.map((item) => item.name).join("、")}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建标签失败。");
    } finally {
      setCreatingTag(false);
    }
  }

  async function handleRenameTag(tagId: string) {
    const nextName = renameTagInput.trim();
    if (!nextName) {
      setMessage("标签名称不能为空。");
      return;
    }

    try {
      const data = await requestJson<{ item: MaterialTagRecord }>(`/api/internal/admin/material-tags/${tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });

      const currentTag = tags.find((item) => item.id === tagId);
      setTags((current) => {
        const remaining = current.filter((item) => item.id !== tagId && item.id !== data.item.id);
        return [...remaining, data.item].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
      });

      if (currentTag) {
        setUploadDraft((current) => ({
          ...current,
          selectedTags: current.selectedTags.map((item) => (item === currentTag.name ? data.item.name : item)),
        }));
        setEditDraft((current) => ({
          ...current,
          tags: current.tags.map((item) => (item === currentTag.name ? data.item.name : item)),
        }));
        setBatchTagDraft((current) => current.map((item) => (item === currentTag.name ? data.item.name : item)));
      }

      await Promise.all([refreshMaterials(), refreshClaims()]);
      setRenamingTagId(null);
      setRenameTagInput("");
      setMessage(`标签已更新为“${data.item.name}”。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重命名标签失败。");
    }
  }

  async function handleDeleteTag(tag: MaterialTagRecord) {
    try {
      await requestJson(`/api/internal/admin/material-tags/${tag.id}`, { method: "DELETE" });
      setTags((current) => current.filter((item) => item.id !== tag.id));
      setUploadDraft((current) => ({
        ...current,
        selectedTags: current.selectedTags.filter((item) => item !== tag.name),
      }));
      setEditDraft((current) => ({
        ...current,
        tags: current.tags.filter((item) => item !== tag.name),
      }));
      setBatchTagDraft((current) => current.filter((item) => item !== tag.name));
      await Promise.all([refreshMaterials(), refreshClaims()]);
      setMessage(`标签“${tag.name}”已删除。`);
      setDeleteTagTarget(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除标签失败。");
    }
  }

  function removeQueueItem(queueId: string) {
    setQueue((current) => current.filter((item) => item.id !== queueId));
  }

  async function handleUploadAll() {
    if (queue.length === 0) {
      setMessage("请先选择要上传的视频文件。");
      return;
    }

    setUploading(true);
    setMessage(null);

    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const queueItem of queue) {
      setQueue((current) =>
        current.map((item) => (item.id === queueItem.id ? { ...item, status: "uploading", error: null } : item)),
      );

      const formData = new FormData();
      formData.set("file", queueItem.file, queueItem.file.name);
      formData.set("batchNo", uploadDraft.batchNo.trim());
      formData.set("description", uploadDraft.description.trim());
      formData.set("selectedTags", JSON.stringify(uploadDraft.selectedTags));
      formData.set("newTags", "");
      formData.set("metadata", JSON.stringify(buildQueueMetadata(queueItem)));

      try {
        const data = await requestJson<{ results: UploadApiResult[] }>("/api/internal/admin/materials/upload/complete", {
          method: "POST",
          body: formData,
        });
        const result = data.results?.[0];

        setQueue((current) =>
          current.map((item) => {
            if (item.id !== queueItem.id) {
              return item;
            }
            if (!result) {
              failedCount += 1;
              return { ...item, status: "failed", error: "服务端没有返回当前文件的处理结果。" };
            }
            if (result.status === "created") {
              createdCount += 1;
              return { ...item, status: "created", error: null };
            }
            if (result.status === "skipped_duplicate") {
              skippedCount += 1;
              return { ...item, status: "skipped_duplicate", error: result.message };
            }
            failedCount += 1;
            return { ...item, status: "failed", error: result.message };
          }),
        );
      } catch (error) {
        failedCount += 1;
        const errorMessage = error instanceof Error ? error.message : "上传失败。";
        setQueue((current) =>
          current.map((item) => (item.id === queueItem.id ? { ...item, status: "failed", error: errorMessage } : item)),
        );
      }
    }

    await refreshMaterials();

    setQueue((current) => (failedCount === 0 ? [] : current.filter((item) => item.status === "failed")));
    setUploading(false);
    setMessage(`上传完成：成功 ${createdCount} 条，跳过 ${skippedCount} 条，失败 ${failedCount} 条。`);
  }

  async function handleReset(materialId: string, reason: string) {
    try {
      await requestJson(`/api/internal/admin/materials/${materialId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      await refreshAll();
      setMessage("素材已重置回公海。");
      setResetTarget(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重置失败。");
    }
  }

  async function handleDeleteMaterial(materialId: string, title: string) {
    try {
      await requestJson(`/api/internal/admin/materials/${materialId}`, { method: "DELETE" });
      await refreshMaterials();
      setMessage("素材已删除。");
      if (editingMaterial?.id === materialId) {
        setEditingMaterial(null);
      }
      setDeleteMaterialTarget(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除素材失败。");
    }
  }

  async function handleStatusChange(materialId: string, nextStatus: "AVAILABLE" | "OFF_SHELF") {
    try {
      await requestJson(`/api/internal/admin/materials/${materialId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await refreshMaterials();
      setMessage(nextStatus === "AVAILABLE" ? "素材已重新上架。" : "素材已下架。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "状态更新失败。");
    }
  }

  function openEditModal(item: AdminMaterialItem) {
    setEditingMaterial(item);
    setEditDraft({
      title: item.title,
      description: item.description ?? "",
      batchNo: item.batchNo ?? "",
      status: item.status,
      tags: [...item.tags],
      newTagInput: "",
    });
  }

  async function handleSaveEdit() {
    if (!editingMaterial) {
      return;
    }

    const mergedTags = uniqueTags([...editDraft.tags, ...splitTags(editDraft.newTagInput)]);

    try {
      await requestJson(`/api/internal/admin/materials/${editingMaterial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title.trim(),
          description: editDraft.description.trim() || null,
          batchNo: editDraft.batchNo.trim() || null,
          status: editDraft.status,
          tags: mergedTags,
        }),
      });
      await refreshMaterials();
      setEditingMaterial(null);
      setMessage("素材信息已更新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存素材信息失败。");
    }
  }

  function toggleSelectMaterial(materialId: string) {
    setSelectedMaterialIds((current) =>
      current.includes(materialId) ? current.filter((item) => item !== materialId) : [...current, materialId],
    );
  }

  function toggleSelectAllFiltered() {
    setSelectedMaterialIds((current) => {
      if (allFilteredSelected) {
        return current.filter((id) => !filteredMaterials.some((item) => item.id === id));
      }

      const merged = new Set(current);
      filteredMaterials.forEach((item) => merged.add(item.id));
      return Array.from(merged);
    });
  }

  async function handleBulkAction(action: {
    type: "updateTags" | "changeStatus" | "delete" | "resetClaims";
    tags?: string[];
    status?: "AVAILABLE" | "OFF_SHELF";
    reason?: string | null;
  }) {
    if (selectedMaterialIds.length === 0) {
      setMessage("请先勾选要批量处理的素材。");
      return;
    }

    try {
      const data = await requestJson<{
        summary: {
          totalCount: number;
          successCount: number;
          skippedCount: number;
          failureCount: number;
        };
      }>("/api/internal/admin/materials/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialIds: selectedMaterialIds,
          action,
        }),
      });

      await refreshAll();
      setSelectedMaterialIds([]);
      setBatchTagOpen(false);
      setBatchTagInput("");
      setMessage(
        `批量处理完成：成功 ${data.summary.successCount} 条，跳过 ${data.summary.skippedCount} 条，失败 ${data.summary.failureCount} 条。`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "批量操作失败。");
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) {
      void appendFiles(event.dataTransfer.files);
    }
  }

  const uploadSuccessCount = queue.filter((item) => item.status === "created").length;
  const uploadFailedCount = queue.filter((item) => item.status === "failed").length;
  const selectedCount = selectedMaterialIds.length;

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-2xl border border-[#BFD6FF] bg-[#F4F8FF] px-4 py-3 text-sm text-[#174EA6]">{message}</div>
      ) : null}

      <SectionCard className="bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#0066DD]">素材管理</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">先筛选，再批量处理</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              页面重心回到筛选、列表和批量动作。上传入口继续保留，但退到右上角，不再占据首屏主区域。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              当前结果 {activeTab === "materials" ? filteredMaterials.length : filteredClaims.length} 条
            </div>
            <button
              type="button"
              onClick={() => {
                setUploadOpen(true);
                setMessage(null);
              }}
              className="rounded-full bg-[#0066DD] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0052b3]"
            >
              批量上传视频
            </button>
            <button
              type="button"
              onClick={() => void refreshAll().catch((error) => setMessage(error instanceof Error ? error.message : "刷新失败。"))}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              disabled={loadingData}
            >
              {loadingData ? "刷新中..." : "刷新数据"}
            </button>
          </div>
        </div>

        <div className="mt-6 hidden grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
            <p className="text-sm text-slate-500">素材总数</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{materials.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
            <p className="text-sm text-slate-500">当前已领取</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {materials.filter((item) => Boolean(item.activeClaimId)).length}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
            <p className="text-sm text-slate-500">标签数量</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{tags.length}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("materials")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "materials" ? "bg-[#0066DD] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              素材列表
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("claims")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "claims" ? "bg-[#0066DD] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              领取日志
            </button>
          </div>
          <p className="text-sm text-slate-500">
            {activeTab === "materials"
              ? `当前筛选结果 ${filteredMaterials.length} 条`
              : `当前日志结果 ${filteredClaims.length} 条`}
          </p>
        </div>
      </SectionCard>

      {activeTab === "materials" ? (
        <>
          <SectionCard>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6 xl:items-end">
              <label className="space-y-2 xl:col-span-2">
                <span className="block text-sm font-medium text-slate-700">搜索素材</span>
                <input
                  value={materialKeyword}
                  onChange={(event) => setMaterialKeyword(event.target.value)}
                  placeholder="搜索标题、文件名、批次号"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">标签</span>
                <select
                  value={materialTagFilter}
                  onChange={(event) => setMaterialTagFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
                >
                  <option value="ALL">全部标签</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.name}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">领取人</span>
                <input
                  value={ownerFilter}
                  onChange={(event) => setOwnerFilter(event.target.value)}
                  placeholder="按领取人筛选"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">领取状态</span>
                <select
                  value={claimStatusFilter}
                  onChange={(event) => setClaimStatusFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
                >
                  <option value="ALL">全部领取状态</option>
                  <option value="CLAIMED">已领取</option>
                  <option value="UNCLAIMED">未领取</option>
                </select>
              </label>
              <div className="flex gap-3 xl:col-span-1">
                <label className="flex-1 space-y-2">
                  <span className="block text-sm font-medium text-slate-700">上架状态</span>
                  <select
                    value={materialStatusFilter}
                    onChange={(event) => setMaterialStatusFilter(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
                  >
                    <option value="ALL">全部上架状态</option>
                    {MATERIAL_STATUS_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMaterialKeyword("");
                    setMaterialTagFilter("ALL");
                    setOwnerFilter("");
                    setClaimStatusFilter("ALL");
                    setMaterialStatusFilter("ALL");
                  }}
                  className="self-end rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  清空
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    aria-label="选择当前筛选结果"
                    className="h-4 w-4 rounded border-slate-300 text-[#0066DD] focus:ring-[#0066DD]"
                  />
                  当前筛选结果全选
                </label>
                <span className="text-sm font-medium text-slate-900">已选 {selectedCount} 条素材</span>
              </div>

              <p className="text-sm text-slate-500">先筛选，再勾选需要处理的素材。</p>
            </div>
          </SectionCard>

          {selectedCount > 0 ? (
            <SectionCard>
              <div
                data-testid="admin-material-bulk-toolbar"
                className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">已选 {selectedCount} 条素材</p>
                  <p className="mt-1 text-sm text-slate-500">批量工具只在有选中项时出现，减少首屏干扰。</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchTagDraft([]);
                      setBatchTagInput("");
                      setBatchTagOpen(true);
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    批量改标签
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkAction({ type: "changeStatus", status: "AVAILABLE" })}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    批量上架
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkAction({ type: "changeStatus", status: "OFF_SHELF" })}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    批量下架
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkResetReasonInput("运营批量回收");
                      setBulkResetOpen(true);
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    批量重置回公海
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkDeleteOpen(true)}
                    className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                  >
                    批量删除
                  </button>
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard className="overflow-hidden p-0">
            {filteredMaterials.length === 0 ? (
              <div className="p-6">
                <EmptyState title="没有符合条件的素材" description="可以调整筛选条件，或者先从右上角打开上传弹窗导入新视频。" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">选择</th>
                      <th className="px-4 py-3 font-medium">素材</th>
                      <th className="px-4 py-3 font-medium">标签</th>
                      <th className="px-4 py-3 font-medium">最近时间</th>
                      <th className="px-4 py-3 font-medium">领取人</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                      <th className="px-4 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMaterials.map((item) => {
                      const selected = selectedMaterialIds.includes(item.id);
                      return (
                        <tr key={item.id} className={selected ? "bg-[#F7FAFF]" : "bg-white"}>
                          <td className="px-4 py-4 align-top">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelectMaterial(item.id)}
                              aria-label={`选择素材 ${item.title}`}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0066DD] focus:ring-[#0066DD]"
                            />
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-start gap-3">
                              <div className="h-16 w-12 overflow-hidden rounded-2xl bg-slate-100">
                                {item.posterUrl ? (
                                  <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" />
                                ) : item.previewUrl ? (
                                  <video
                                    src={item.previewUrl}
                                    poster={item.posterUrl ?? undefined}
                                    className="h-full w-full object-cover"
                                    muted
                                    playsInline
                                    preload="metadata"
                                  />
                                ) : null}
                              </div>
                              <div className="space-y-1">
                                <div className="font-semibold text-slate-900">{item.title}</div>
                                <div className="text-slate-500">{item.sourceFilename}</div>
                                <div className="text-xs text-slate-400">
                                  {formatDuration(item.durationMs)} / {formatDimensions(item.width, item.height)} / {formatBytes(item.fileSizeBytes)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex max-w-[220px] flex-wrap gap-2">
                              {item.tags.length > 0 ? (
                                item.tags.map((tag) => (
                                  <span
                                    key={`${item.id}-${tag}`}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                                  >
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400">未设置标签</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top text-slate-600">{formatDateTime(item.createdAt)}</td>
                          <td className="px-4 py-4 align-top text-slate-600">{item.exclusiveOwnerName ?? "未领取"}</td>
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">{getMaterialStatusLabel(item.status)}</div>
                              <div className="text-xs text-slate-500">领取次数 {item.claimCount}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                                aria-label={`查看 ${item.title}`}
                              >
                                查看
                              </button>
                              {item.status === "OFF_SHELF" ? (
                                <button
                                  type="button"
                                  onClick={() => void handleStatusChange(item.id, "AVAILABLE")}
                                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                                >
                                  上架
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleStatusChange(item.id, "OFF_SHELF")}
                                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                                >
                                  下架
                                </button>
                              )}
                              {item.activeClaimId ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetReasonInput("运营回收");
                                    setResetTarget({ materialId: item.id, title: item.title });
                                  }}
                                  className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-800"
                                >
                                  重置回公海
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setDeleteMaterialTarget({ materialId: item.id, title: item.title })}
                                className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      ) : (
        <>
          <SectionCard>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
              <label className="space-y-2 xl:col-span-2">
                <span className="block text-sm font-medium text-slate-700">搜索日志</span>
                <input
                  value={claimKeyword}
                  onChange={(event) => setClaimKeyword(event.target.value)}
                  placeholder="搜索素材标题、用户名、显示名"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">领取人</span>
                <select
                  value={claimOwnerFilter}
                  onChange={(event) => setClaimOwnerFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
                >
                  <option value="ALL">全部领取人</option>
                  {claimOwnerOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-3">
                <label className="flex-1 space-y-2">
                  <span className="block text-sm font-medium text-slate-700">状态</span>
                  <select
                    value={claimLogStatusFilter}
                    onChange={(event) => setClaimLogStatusFilter(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
                  >
                    <option value="ALL">全部领取状态</option>
                    <option value="ACTIVE">已领取</option>
                    <option value="RESET_BY_ADMIN">已重置</option>
                    <option value="DELIVERY_FAILED">发放失败</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setClaimKeyword("");
                    setClaimOwnerFilter("ALL");
                    setClaimLogStatusFilter("ALL");
                  }}
                  className="self-end rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  清空
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="overflow-hidden p-0">
            {filteredClaims.length === 0 ? (
              <div className="p-6">
                <EmptyState title="没有符合条件的领取日志" description="领取、回收和失败日志都会显示在这里，方便回溯素材流转。" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">素材</th>
                      <th className="px-4 py-3 font-medium">领取人</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                      <th className="px-4 py-3 font-medium">时间</th>
                      <th className="px-4 py-3 font-medium">备注</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClaims.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 text-slate-900">{item.materialTitle}</td>
                        <td className="px-4 py-4 text-slate-600">
                          {item.displayName}（{item.username}）
                        </td>
                        <td className="px-4 py-4 text-slate-600">{getClaimStatusLabel(item.status)}</td>
                        <td className="px-4 py-4 text-slate-600">{formatDateTime(item.createdAt)}</td>
                        <td className="px-4 py-4 text-slate-600">{item.resetReason ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}

      {uploadOpen ? (
        <Modal
          title="批量上传视频"
          description="在一个弹窗内完成选文件、统一标签、标签维护和上传结果查看。上传会逐文件提交，单条失败不会影响整批。"
          onClose={() => setUploadOpen(false)}
          widthClass="max-w-7xl"
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.95fr)]">
            <section className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-950">上传设置</h4>
                  <p className="mt-1 text-sm text-slate-500">左侧集中处理选文件、批次、统一标签和描述，上传队列统一在下方横向表格里确认。</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">队列 {queue.length} 个文件</div>
              </div>

              <div className="mt-5 space-y-5">
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition ${
                    dragging ? "border-[#0066DD] bg-[#F4F8FF]" : "border-slate-200 bg-white"
                  }`}
                >
                  <h4 className="text-2xl font-bold text-slate-950">拖拽视频到这里，或点击按钮选择文件</h4>
                  <p className="mt-3 text-sm text-slate-500">当前支持 mp4、mov、m4v、webm、avi、mkv，可批量加入上传队列。</p>
                  <label className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-full bg-[#0066DD] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0052b3]">
                    选择视频文件
                    <input
                      type="file"
                      accept={VIDEO_ACCEPT}
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        if (event.target.files) {
                          void appendFiles(event.target.files);
                          event.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">批次号</label>
                    <input
                      value={uploadDraft.batchNo}
                      onChange={(event) => setUploadDraft((current) => ({ ...current, batchNo: event.target.value }))}
                      placeholder="例如 20260322-A"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">统一标签</label>
                    <div className="flex min-h-[52px] flex-wrap items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      {tags.length > 0 ? (
                        tags.map((tag) => {
                          const active = uploadDraft.selectedTags.includes(tag.name);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() =>
                                setUploadDraft((current) => ({
                                  ...current,
                                  selectedTags: toggleTag(current.selectedTags, tag.name),
                                }))
                              }
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${badgeClass(active)}`}
                            >
                              {tag.name}
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-sm text-slate-400">还没有标签，先在右侧标签库创建。</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">统一描述</label>
                  <textarea
                    value={uploadDraft.description}
                    onChange={(event) => setUploadDraft((current) => ({ ...current, description: event.target.value }))}
                    rows={4}
                    placeholder="这段描述会应用到本次上传的所有视频。"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-950">标签库</h4>
                  <p className="mt-1 text-sm text-slate-500">标签维护和上传选择放在同一张横向列表里，方便管理员在电脑端快速批量操作。</p>
                </div>
                <div className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-500">{tags.length} 个标签</div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  value={uploadDraft.newTagInput}
                  onChange={(event) => setUploadDraft((current) => ({ ...current, newTagInput: event.target.value }))}
                  placeholder="输入新标签，支持逗号分隔"
                  className="min-w-[220px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateTag()}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  disabled={creatingTag}
                >
                  {creatingTag ? "创建中..." : "新增标签"}
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200">
                {tags.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-slate-500">
                          <th className="px-4 py-3 font-medium">标签名</th>
                          <th className="px-4 py-3 font-medium">用于本次上传</th>
                          <th className="px-4 py-3 font-medium text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {tags.map((tag) => {
                          const selected = uploadDraft.selectedTags.includes(tag.name);
                          const isRenaming = renamingTagId === tag.id;

                          return (
                            <tr key={tag.id}>
                              <td className="px-4 py-4 align-middle">
                                {isRenaming ? (
                                  <div className="flex gap-2">
                                    <input
                                      value={renameTagInput}
                                      onChange={(event) => setRenameTagInput(event.target.value)}
                                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#0066DD]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => void handleRenameTag(tag.id)}
                                      className="rounded-xl bg-[#0066DD] px-3 py-2 text-sm font-semibold text-white"
                                    >
                                      保存
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRenamingTagId(null);
                                        setRenameTagInput("");
                                      }}
                                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ) : (
                                  <div className="font-medium text-slate-900">{tag.name}</div>
                                )}
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUploadDraft((current) => ({
                                      ...current,
                                      selectedTags: toggleTag(current.selectedTags, tag.name),
                                    }))
                                  }
                                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${badgeClass(selected)}`}
                                >
                                  {selected ? "已加入本批次" : "加入本批次"}
                                </button>
                              </td>
                              <td className="px-4 py-4 align-middle">
                                {!isRenaming ? (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRenamingTagId(tag.id);
                                        setRenameTagInput(tag.name);
                                      }}
                                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                    >
                                      重命名
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTagTarget(tag)}
                                      className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-600 transition hover:bg-rose-100"
                                    >
                                      删除
                                    </button>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-5">
                    <EmptyState title="还没有标签" description="先创建几组常用标签，上传时就能快速复用。" />
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h4 className="text-lg font-semibold text-slate-950">上传队列</h4>
                <p className="mt-1 text-sm text-slate-500">
                  当前 {queue.length} 个文件，成功 {uploadSuccessCount} 个，失败 {uploadFailedCount} 个。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setQueue([])}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  disabled={uploading || queue.length === 0}
                >
                  清空队列
                </button>
                <button
                  type="button"
                  onClick={() => void handleUploadAll()}
                  className="rounded-full bg-[#0066DD] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052b3]"
                  disabled={uploading || queue.length === 0}
                >
                  {uploading ? "上传中..." : "开始上传"}
                </button>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="p-5">
                <EmptyState title="还没有加入上传队列" description="拖入一批视频后，这里会显示逐条文件状态和上传结果。" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">文件</th>
                      <th className="px-4 py-3 font-medium">标题</th>
                      <th className="px-4 py-3 font-medium">时长</th>
                      <th className="px-4 py-3 font-medium">尺寸</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                      <th className="px-4 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {queue.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            <div className="font-medium text-slate-900">{item.file.name}</div>
                            <div className="text-xs text-slate-500">{formatBytes(item.file.size)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <input
                            value={item.title}
                            onChange={(event) =>
                              setQueue((current) =>
                                current.map((queueItem) =>
                                  queueItem.id === item.id ? { ...queueItem, title: event.target.value } : queueItem,
                                ),
                              )
                            }
                            className="w-full min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#0066DD]"
                          />
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">{formatDuration(item.durationMs)}</td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          {formatDimensions(item.width, item.height)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            <div className="font-medium text-slate-900">{getQueueStatusLabel(item.status)}</div>
                            {item.error ? <div className="text-xs text-rose-500">{item.error}</div> : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => removeQueueItem(item.id)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                            disabled={uploading}
                          >
                            移除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      ) : null}

      {batchTagOpen ? (
        <Modal
          title="批量改标签"
          description={`为已选中的 ${selectedCount} 条素材设置新的标签集合。提交后会统一覆盖这些素材的标签。`}
          onClose={() => setBatchTagOpen(false)}
          widthClass="max-w-3xl"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {tags.length > 0 ? (
                tags.map((tag) => {
                  const active = batchTagDraft.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setBatchTagDraft((current) => toggleTag(current, tag.name))}
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${badgeClass(active)}`}
                    >
                      {tag.name}
                    </button>
                  );
                })
              ) : (
                <span className="text-sm text-slate-400">还没有标签，可以直接输入新标签。</span>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">补充新标签</label>
              <input
                value={batchTagInput}
                onChange={(event) => setBatchTagInput(event.target.value)}
                placeholder="支持用逗号分隔多个标签"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBatchTagOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalTags = uniqueTags([...batchTagDraft, ...splitTags(batchTagInput)]);
                  void handleBulkAction({ type: "updateTags", tags: finalTags });
                }}
                className="rounded-full bg-[#0066DD] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052b3]"
              >
                保存批量标签
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {editingMaterial ? (
        <Drawer
          title={`素材详情：${editingMaterial.title}`}
          description="在同一个侧边抽屉里完成预览、编辑、上下架和删除，减少来回弹窗。"
          onClose={() => setEditingMaterial(null)}
        >
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950">
              {editingMaterial.previewUrl ? (
                <video
                  src={editingMaterial.previewUrl}
                  poster={editingMaterial.posterUrl ?? undefined}
                  className="aspect-[16/10] w-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : editingMaterial.posterUrl ? (
                <img src={editingMaterial.posterUrl} alt={editingMaterial.title} className="aspect-[16/10] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center text-sm text-white/70">暂无预览</div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">领取状态</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{editingMaterial.activeClaimId ? "已领取" : "未领取"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">上传时间</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(editingMaterial.createdAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">批次号</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{editingMaterial.batchNo ?? "未填写"}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">标题</label>
              <input
                value={editDraft.title}
                onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">描述</label>
              <textarea
                value={editDraft.description}
                onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">批次号</label>
              <input
                value={editDraft.batchNo}
                onChange={(event) => setEditDraft((current) => ({ ...current, batchNo: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">状态</label>
              <select
                value={editDraft.status}
                onChange={(event) =>
                  setEditDraft((current) => ({ ...current, status: event.target.value as MaterialStatus }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
              >
                {MATERIAL_STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">标签</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = editDraft.tags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setEditDraft((current) => ({
                          ...current,
                          tags: toggleTag(current.tags, tag.name),
                        }))
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${badgeClass(active)}`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">补充新标签</label>
              <input
                value={editDraft.newTagInput}
                onChange={(event) => setEditDraft((current) => ({ ...current, newTagInput: event.target.value }))}
                placeholder="支持逗号分隔多个标签"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]"
              />
            </div>
          </div>

            <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap gap-2">
                {editingMaterial.status === "OFF_SHELF" ? (
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(editingMaterial.id, "AVAILABLE")}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    上架
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(editingMaterial.id, "OFF_SHELF")}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    下架
                  </button>
                )}
                {editingMaterial.activeClaimId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setResetReasonInput("运营回收");
                      setResetTarget({ materialId: editingMaterial.id, title: editingMaterial.title });
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    重置回公海
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setDeleteMaterialTarget({ materialId: editingMaterial.id, title: editingMaterial.title })}
                  className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                >
                  删除
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveEdit()}
                  className="rounded-full bg-[#0066DD] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052b3]"
                >
                  保存修改
                </button>
              </div>
            </div>
          </div>
        </Drawer>
      ) : null}

      <ConfirmDialog
        open={deleteTagTarget !== null}
        title="删除素材标签"
        description={
          deleteTagTarget ? `确定要删除标签“${deleteTagTarget.name}”吗？删除后只会移除标签关联，不会删除素材。` : null
        }
        confirmLabel="确认删除"
        confirmTone="danger"
        onClose={() => setDeleteTagTarget(null)}
        onConfirm={() => {
          if (deleteTagTarget) {
            void handleDeleteTag(deleteTagTarget);
          }
        }}
      />

      <FormDialog
        open={resetTarget !== null}
        title="重置回公海"
        description={resetTarget ? `为素材《${resetTarget.title}》填写重置原因。` : null}
        confirmLabel="提交重置"
        confirmDisabled={!resetReasonInput.trim()}
        onClose={() => setResetTarget(null)}
        onSubmit={() => {
          if (resetTarget) {
            void handleReset(resetTarget.materialId, resetReasonInput.trim());
          }
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">重置原因</span>
          <textarea
            value={resetReasonInput}
            onChange={(event) => setResetReasonInput(event.target.value)}
            className="min-h-24 w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </FormDialog>

      <ConfirmDialog
        open={deleteMaterialTarget !== null}
        title="删除素材"
        description={deleteMaterialTarget ? `确定要删除素材《${deleteMaterialTarget.title}》吗？删除后将从列表中隐藏。` : null}
        confirmLabel="确认删除"
        confirmTone="danger"
        onClose={() => setDeleteMaterialTarget(null)}
        onConfirm={() => {
          if (deleteMaterialTarget) {
            void handleDeleteMaterial(deleteMaterialTarget.materialId, deleteMaterialTarget.title);
          }
        }}
      />

      <FormDialog
        open={bulkResetOpen}
        title="批量重置回公海"
        description={`为当前选中的 ${selectedCount} 条素材填写统一重置原因。`}
        confirmLabel="批量重置"
        confirmDisabled={!bulkResetReasonInput.trim()}
        onClose={() => setBulkResetOpen(false)}
        onSubmit={() => {
          setBulkResetOpen(false);
          void handleBulkAction({ type: "resetClaims", reason: bulkResetReasonInput.trim() });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">重置原因</span>
          <textarea
            value={bulkResetReasonInput}
            onChange={(event) => setBulkResetReasonInput(event.target.value)}
            className="min-h-24 w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </FormDialog>

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="批量删除素材"
        description={`确定要删除当前选中的 ${selectedCount} 条素材吗？删除后这些素材会从列表中隐藏。`}
        confirmLabel="批量删除"
        confirmTone="danger"
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => {
          setBulkDeleteOpen(false);
          void handleBulkAction({ type: "delete" });
        }}
      />
    </div>
  );
}
