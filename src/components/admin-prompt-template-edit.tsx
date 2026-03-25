"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import { FormDialog } from "@/components/form-dialog";
import { ImageLightbox } from "@/components/image-lightbox";
import type {
  AppDefinition,
  PromptTemplateAdminRecord,
  PromptTemplateCategoryRecord,
  PromptTemplateMediaType,
  PromptTemplateScopeMode,
  PromptTemplateTagRecord,
} from "@/lib/types";

interface Props {
  open: boolean;
  template?: PromptTemplateAdminRecord | null;
  apps: AppDefinition[];
  allTags: PromptTemplateTagRecord[];
  allCategories: PromptTemplateCategoryRecord[];
  onSaved: (template: PromptTemplateAdminRecord, isNew: boolean) => void;
  onClose: () => void;
  onTagsChange?: (tags: PromptTemplateTagRecord[]) => void;
  onCategoriesChange?: (categories: PromptTemplateCategoryRecord[]) => void;
}

type TagDraft = { id: string | null; name: string; color: string; originalName: string | null };
type CategoryDraft = {
  id: string | null;
  name: string;
  color: string;
  sortOrder: number;
  enabled: boolean;
};
type UploadTarget = "image" | "video" | "poster" | null;
type TemplateVariableToken = "prompt" | "style" | "scene" | "negative_prompt";

const mediaOptions: Array<{ value: PromptTemplateMediaType; label: string }> = [
  { value: "IMAGE", label: "图片示例" },
  { value: "VIDEO", label: "视频示例" },
];

const templateVariableOptions: Array<{
  token: TemplateVariableToken;
  label: string;
  description: string;
}> = [
  { token: "prompt", label: "{{input.prompt}}", description: "用户主提示词" },
  { token: "style", label: "{{input.style}}", description: "风格要求" },
  { token: "scene", label: "{{input.scene}}", description: "场景或镜头" },
  { token: "negative_prompt", label: "{{input.negative_prompt}}", description: "负面提示词" },
];

async function readResponseJson(response: Response) {
  return response.json().catch(() => ({}));
}

function sortCategories(categories: PromptTemplateCategoryRecord[]) {
  return [...categories].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "zh-CN"),
  );
}

function getDefaultCategoryId(categories: PromptTemplateCategoryRecord[]) {
  return sortCategories(categories.filter((category) => category.enabled))[0]?.id ?? "";
}

function getNextCategorySortOrder(categories: PromptTemplateCategoryRecord[]) {
  return sortCategories(categories).length;
}

function FieldCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function PillButton({
  active,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      {...props}
      className={[
        "rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)]"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
        props.disabled ? "cursor-not-allowed opacity-50" : "",
        props.className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function AdminPromptTemplateEdit({
  open,
  template,
  apps,
  allTags,
  allCategories,
  onSaved,
  onClose,
  onTagsChange,
  onCategoriesChange,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templatePrompt, setTemplatePrompt] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [scopeMode, setScopeMode] = useState<PromptTemplateScopeMode>("GLOBAL");
  const [scopeAppCodes, setScopeAppCodes] = useState<string[]>([]);
  const [legacyAppCode, setLegacyAppCode] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [sampleMediaType, setSampleMediaType] = useState<PromptTemplateMediaType>("IMAGE");
  const [sampleMediaUrl, setSampleMediaUrl] = useState("");
  const [samplePosterUrl, setSamplePosterUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<UploadTarget>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverPreviewOpen, setCoverPreviewOpen] = useState(false);
  const [localTags, setLocalTags] = useState<PromptTemplateTagRecord[]>(allTags);
  const [localCategories, setLocalCategories] = useState<PromptTemplateCategoryRecord[]>(allCategories);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState<TagDraft>({
    id: null,
    name: "",
    color: "#2563eb",
    originalName: null,
  });
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>({
    id: null,
    name: "",
    color: "#2563eb",
    sortOrder: 0,
    enabled: true,
  });
  const [managerPending, setManagerPending] = useState<string | null>(null);
  const [managerMessage, setManagerMessage] = useState<string | null>(null);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const posterInputRef = useRef<HTMLInputElement | null>(null);
  const localTagsRef = useRef(localTags);
  const localCategoriesRef = useRef(localCategories);
  const lastInitializedTemplateKeyRef = useRef<string | null>(null);

  const appOptions = useMemo(
    () =>
      apps.map((app) => ({
        code: app.code,
        name: app.name,
      })),
    [apps],
  );

  const categoryOptions = useMemo(
    () =>
      sortCategories(localCategories.filter((category) => category.enabled)).map((category) => ({
        id: category.id,
        name: category.name,
      })),
    [localCategories],
  );

  const coverPreviewUrl = sampleMediaType === "IMAGE" ? sampleMediaUrl.trim() : samplePosterUrl.trim();
  const coverPreviewName = name.trim() || (sampleMediaType === "IMAGE" ? "示例图片封面" : "视频封面");

  function replaceLocalTags(nextTags: PromptTemplateTagRecord[]) {
    localTagsRef.current = nextTags;
    setLocalTags(nextTags);
  }

  function replaceLocalCategories(nextCategories: PromptTemplateCategoryRecord[]) {
    localCategoriesRef.current = nextCategories;
    setLocalCategories(nextCategories);
  }

  useEffect(() => {
    localTagsRef.current = allTags;
    setLocalTags(allTags);
  }, [allTags]);

  useEffect(() => {
    localCategoriesRef.current = allCategories;
    setLocalCategories(allCategories);
  }, [allCategories]);

  useEffect(() => {
    if (!open) {
      lastInitializedTemplateKeyRef.current = null;
      return;
    }

    const templateKey = template?.id ?? "__new__";
    if (lastInitializedTemplateKeyRef.current === templateKey) {
      return;
    }
    lastInitializedTemplateKeyRef.current = templateKey;

    setName(template?.name ?? "");
    setDescription(template?.description ?? "");
    setTemplatePrompt(template?.templatePrompt ?? "");
    setEnabled(template?.enabled ?? true);
    setScopeMode(template?.scopeMode ?? "GLOBAL");
    setScopeAppCodes(template?.scopeAppCodes ?? []);
    setLegacyAppCode(template?.appCode ?? appOptions[0]?.code ?? "");
    setSelectedTags(template?.tags ?? []);
    setCategoryId(template?.categoryId ?? getDefaultCategoryId(localCategoriesRef.current));
    setSampleMediaType(template?.sampleMediaType ?? "IMAGE");
    setSampleMediaUrl(template?.sampleMediaUrl ?? template?.coverImageUrl ?? "");
    setSamplePosterUrl(template?.samplePosterUrl ?? "");
    setError(null);
    setManagerMessage(null);
    setTagDraft({ id: null, name: "", color: "#2563eb", originalName: null });
    setCategoryDraft({
      id: null,
      name: "",
      color: "#2563eb",
      sortOrder: getNextCategorySortOrder(localCategoriesRef.current),
      enabled: true,
    });
  }, [appOptions, open, template]);

  const isEditing = Boolean(template?.id);

  if (!open) {
    return null;
  }

  function toggleTag(tagName: string) {
    setSelectedTags((current) =>
      current.includes(tagName) ? current.filter((item) => item !== tagName) : [...current, tagName],
    );
  }

  function toggleScopeApp(appCode: string) {
    setScopeAppCodes((current) =>
      current.includes(appCode) ? current.filter((item) => item !== appCode) : [...current, appCode],
    );
  }

  function insertVariable(token: TemplateVariableToken) {
    const nextToken = `{{input.${token}}}`;
    const editor = editorRef.current;
    if (!editor) {
      setTemplatePrompt((current) => (current ? `${current}\n${nextToken}` : nextToken));
      return;
    }

    const start = editor.selectionStart ?? templatePrompt.length;
    const end = editor.selectionEnd ?? templatePrompt.length;
    const nextValue = `${templatePrompt.slice(0, start)}${nextToken}${templatePrompt.slice(end)}`;
    setTemplatePrompt(nextValue);

    requestAnimationFrame(() => {
      editor.focus();
      const cursor = start + nextToken.length;
      editor.setSelectionRange(cursor, cursor);
    });
  }

  async function handleUpload(file: File, target: Exclude<UploadTarget, null>) {
    setUploadingTarget(target);
    setError(null);

    try {
      const payload = new FormData();
      payload.set("file", file);

      const response = await fetch("/api/internal/upload", {
        method: "POST",
        body: payload,
      });
      const data = (await readResponseJson(response)) as { error?: string; url?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "上传示例媒体失败。");
      }

      if (target === "poster") {
        setSamplePosterUrl(data.url);
      } else {
        setSampleMediaUrl(data.url);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传示例媒体失败。");
    } finally {
      setUploadingTarget(null);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("请输入模板名称。");
      return;
    }

    if (!categoryId) {
      setError("请选择主分类。");
      return;
    }

    if (!sampleMediaUrl.trim()) {
      setError(sampleMediaType === "VIDEO" ? "请补充示例视频。" : "请补充示例图片。");
      return;
    }

    if (!templatePrompt.trim()) {
      setError("请输入模板正文。");
      return;
    }

    if (scopeMode === "LIMITED" && scopeAppCodes.length === 0) {
      setError("限定应用时，至少选择一个应用。");
      return;
    }

    setSaving(true);
    setError(null);

    const normalizedCover =
      sampleMediaType === "VIDEO" ? samplePosterUrl.trim() || null : sampleMediaUrl.trim() || null;

    try {
      const response = await fetch(
        isEditing ? `/api/internal/admin/prompt-templates/${template!.id}` : "/api/internal/admin/prompt-templates",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appCode: legacyAppCode || null,
            categoryId,
            name: name.trim(),
            description: description.trim() || null,
            coverImageUrl: normalizedCover,
            sampleMediaType,
            sampleMediaUrl: sampleMediaUrl.trim(),
            samplePosterUrl: sampleMediaType === "VIDEO" ? samplePosterUrl.trim() || null : null,
            templatePrompt: templatePrompt.trim(),
            tags: selectedTags,
            enabled,
            scopeMode,
            scopeAppCodes,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "保存模板失败。");
      }

      const data = await response.json();
      onSaved(data.item, !isEditing);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存模板失败。");
    } finally {
      setSaving(false);
    }
  }

  async function saveTag() {
    if (!tagDraft.name.trim()) {
      setManagerMessage("请输入标签名称。");
      return;
    }

    setManagerPending("tag");
    setManagerMessage(null);

    try {
      const response = await fetch(
        tagDraft.id ? `/api/internal/admin/prompt-tags/${tagDraft.id}` : "/api/internal/admin/prompt-tags",
        {
          method: tagDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: tagDraft.name.trim(),
            color: tagDraft.color,
          }),
        },
      );

      const data = (await readResponseJson(response)) as { error?: string; item?: PromptTemplateTagRecord };
      if (!response.ok || !data.item) {
        throw new Error(data.error ?? "保存标签失败。");
      }

      const nextTags = tagDraft.id
        ? localTagsRef.current.map((tag) => (tag.id === data.item!.id ? data.item! : tag))
        : [...localTagsRef.current, data.item!];
      replaceLocalTags(nextTags);
      onTagsChange?.(nextTags);

      if (tagDraft.id && tagDraft.originalName && tagDraft.originalName !== data.item.name) {
        setSelectedTags((current) =>
          current.map((tagName) => (tagName === tagDraft.originalName ? data.item!.name : tagName)),
        );
      }

      setTagDraft({ id: null, name: "", color: "#2563eb", originalName: null });
      setManagerMessage(tagDraft.id ? "标签已更新。" : "标签已新增。");
    } catch (tagError) {
      setManagerMessage(tagError instanceof Error ? tagError.message : "保存标签失败。");
    } finally {
      setManagerPending(null);
    }
  }

  async function removeTag(tag: PromptTemplateTagRecord) {
    setManagerPending(`tag-delete-${tag.id}`);
    setManagerMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/prompt-tags/${tag.id}`, {
        method: "DELETE",
      });
      const data = (await readResponseJson(response)) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "删除标签失败。");
      }

      const nextTags = localTagsRef.current.filter((item) => item.id !== tag.id);
      replaceLocalTags(nextTags);
      onTagsChange?.(nextTags);
      setSelectedTags((current) => current.filter((item) => item !== tag.name));
      if (tagDraft.id === tag.id) {
        setTagDraft({ id: null, name: "", color: "#2563eb", originalName: null });
      }
      setManagerMessage("标签已删除。");
    } catch (tagError) {
      setManagerMessage(tagError instanceof Error ? tagError.message : "删除标签失败。");
    } finally {
      setManagerPending(null);
    }
  }

  async function saveCategory() {
    if (!categoryDraft.name.trim()) {
      setManagerMessage("请输入分类名称。");
      return;
    }

    setManagerPending("category");
    setManagerMessage(null);

    try {
      const response = await fetch(
        categoryDraft.id
          ? `/api/internal/admin/prompt-template-categories/${categoryDraft.id}`
          : "/api/internal/admin/prompt-template-categories",
        {
          method: categoryDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryDraft.name.trim(),
            color: categoryDraft.color,
            sortOrder: categoryDraft.sortOrder,
            enabled: categoryDraft.enabled,
          }),
        },
      );

      const data = (await readResponseJson(response)) as {
        error?: string;
        item?: PromptTemplateCategoryRecord;
      };
      if (!response.ok || !data.item) {
        throw new Error(data.error ?? "保存分类失败。");
      }

      const nextCategories = categoryDraft.id
        ? localCategoriesRef.current.map((category) => (category.id === data.item!.id ? data.item! : category))
        : [...localCategoriesRef.current, data.item!];
      const sorted = sortCategories(nextCategories);
      replaceLocalCategories(sorted);
      onCategoriesChange?.(sorted);

      setCategoryId((current) => current || data.item!.id);
      setCategoryDraft({
        id: null,
        name: "",
        color: "#2563eb",
        sortOrder: getNextCategorySortOrder(sorted),
        enabled: true,
      });
      setManagerMessage(categoryDraft.id ? "分类已更新。" : "分类已新增。");
    } catch (categoryError) {
      setManagerMessage(categoryError instanceof Error ? categoryError.message : "保存分类失败。");
    } finally {
      setManagerPending(null);
    }
  }

  async function removeCategory(category: PromptTemplateCategoryRecord) {
    setManagerPending(`category-delete-${category.id}`);
    setManagerMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/prompt-template-categories/${category.id}`, {
        method: "DELETE",
      });
      const data = (await readResponseJson(response)) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "删除分类失败。");
      }

      const nextCategories = localCategoriesRef.current.filter((item) => item.id !== category.id);
      const sorted = sortCategories(nextCategories);
      replaceLocalCategories(sorted);
      onCategoriesChange?.(sorted);
      setCategoryId((current) => (current === category.id ? getDefaultCategoryId(sorted) : current));
      if (categoryDraft.id === category.id) {
        setCategoryDraft({
          id: null,
          name: "",
          color: "#2563eb",
          sortOrder: getNextCategorySortOrder(sorted),
          enabled: true,
        });
      }
      setManagerMessage("分类已删除。");
    } catch (categoryError) {
      setManagerMessage(categoryError instanceof Error ? categoryError.message : "删除分类失败。");
    } finally {
      setManagerPending(null);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-sm"
        onClick={() => {
          if (!saving) {
            onClose();
          }
        }}
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEditing ? "编辑提示词模板" : "新建提示词模板"}
          className="flex h-[88vh] w-full max-w-[1380px] flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.22)]"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-7 py-6">
            <div>
              <p className="text-sm font-semibold text-blue-600">提示词模板</p>
              <h2 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">
                {isEditing ? "编辑提示词模板" : "新建提示词模板"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                模板正文仅后台可见，不会下发给用户。最终执行 prompt 由服务端生成，若正文包含变量则按变量替换，否则兼容旧拼接规则。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-400 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
              aria-label="关闭"
            >
              ×
            </button>
          </header>

          <div className="flex min-h-0 flex-1 gap-6 overflow-hidden px-6 py-6">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="space-y-5">
                <FieldCard title="基础信息" description="模板名称和简述会用于后台识别与检索。">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">模板名称</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="例如：女装拍摄模板"
                      className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">安全简介</span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="这段简介会展示给用户，用来帮助他们理解模板用途。"
                      className="min-h-28 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </FieldCard>

                <FieldCard
                  title="示例媒体"
                  description="用户只会看到示例图或示例视频，不会看到模板正文。"
                  action={
                    <div className="flex flex-wrap gap-2">
                      {mediaOptions.map((option) => (
                        <PillButton
                          key={option.value}
                          active={sampleMediaType === option.value}
                          onClick={() => setSampleMediaType(option.value)}
                        >
                          {option.label}
                        </PillButton>
                      ))}
                    </div>
                  }
                >
                  <div className="flex flex-wrap gap-3">
                    {sampleMediaType === "IMAGE" ? (
                      <>
                        <PillButton
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploadingTarget !== null}
                        >
                          {uploadingTarget === "image" ? "上传中..." : "本地上传图片"}
                        </PillButton>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void handleUpload(file, "image");
                            }
                            event.target.value = "";
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <PillButton
                          onClick={() => videoInputRef.current?.click()}
                          disabled={uploadingTarget !== null}
                        >
                          {uploadingTarget === "video" ? "上传中..." : "本地上传视频"}
                        </PillButton>
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void handleUpload(file, "video");
                            }
                            event.target.value = "";
                          }}
                        />
                        <PillButton
                          onClick={() => posterInputRef.current?.click()}
                          disabled={uploadingTarget !== null}
                        >
                          {uploadingTarget === "poster" ? "上传中..." : "上传封面图"}
                        </PillButton>
                        <input
                          ref={posterInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void handleUpload(file, "poster");
                            }
                            event.target.value = "";
                          }}
                        />
                      </>
                    )}
                  </div>

                  {sampleMediaType === "IMAGE" ? (
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-700">示例图片地址</span>
                      <input
                        value={sampleMediaUrl}
                        onChange={(event) => setSampleMediaUrl(event.target.value)}
                        placeholder="用于用户查看图片模板的大图示例"
                        className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-slate-700">示例视频地址</span>
                        <input
                          value={sampleMediaUrl}
                          onChange={(event) => setSampleMediaUrl(event.target.value)}
                          placeholder="用于用户查看视频模板示例"
                          className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-slate-700">视频封面图地址</span>
                        <input
                          value={samplePosterUrl}
                          onChange={(event) => setSamplePosterUrl(event.target.value)}
                          placeholder="可选，用于视频封面预览"
                          className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    </div>
                  )}

                  {sampleMediaUrl ? (
                    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">封面</p>
                      <div className="mt-3 flex flex-wrap items-start gap-4">
                        {sampleMediaType === "IMAGE" || samplePosterUrl ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setCoverPreviewOpen(true)}
                              className="group w-full max-w-[360px] overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50 text-left transition hover:border-slate-300"
                              aria-label="查看完整封面"
                            >
                              <div className="flex h-56 items-center justify-center p-3">
                                <Image
                                  src={coverPreviewUrl}
                                  alt={sampleMediaType === "IMAGE" ? "示例图片封面" : "视频封面缩略图"}
                                  width={960}
                                  height={540}
                                  unoptimized
                                  className="h-full w-full object-contain"
                                />
                              </div>
                            </button>
                            <div className="min-w-[180px] flex-1 rounded-[16px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-500">
                              <p className="font-medium text-slate-700">当前按完整比例展示缩略图，避免裁切主体。</p>
                              <button
                                type="button"
                                onClick={() => setCoverPreviewOpen(true)}
                                className="mt-2 text-sm font-semibold text-blue-600 transition hover:text-blue-500"
                              >
                                查看完整图片
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex h-48 w-full items-center justify-center rounded-[16px] bg-slate-100 text-sm text-slate-500">
                            已上传视频，若需要更直观展示可补充封面图。
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </FieldCard>

                <FieldCard
                  title="模板正文"
                  description="模板正文只在后台可见。建议用变量控制用户输入落点，让模板更稳定可维护。"
                  action={
                    <div className="flex flex-wrap gap-2">
                      {templateVariableOptions.map((item) => (
                        <PillButton
                          key={item.token}
                          onClick={() => insertVariable(item.token)}
                          aria-label={`插入 ${item.label}`}
                        >
                          插入 {item.label}
                        </PillButton>
                      ))}
                    </div>
                  }
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {templateVariableOptions.map((item) => (
                      <div key={item.token} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                      </div>
                    ))}
                  </div>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">模板正文</span>
                    <textarea
                      ref={editorRef}
                      aria-label="模板正文"
                      value={templatePrompt}
                      onChange={(event) => setTemplatePrompt(event.target.value)}
                      placeholder={"你是一名资深提示词专家……\n请根据以下用户输入生成结果：\n\n{{input.prompt}}"}
                      className="min-h-[320px] w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 font-mono text-sm leading-7 text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <div className="rounded-[20px] border border-blue-100 bg-blue-50 px-4 py-4">
                    <p className="text-sm font-semibold text-blue-950">最终执行说明</p>
                    <div className="mt-2 space-y-1 text-sm leading-6 text-blue-900/80">
                      <p>1. 模板正文仅后台可见，不会原样透传给用户。</p>
                      <p>2. 若正文包含变量，服务端会优先按变量替换。</p>
                      <p>3. 若正文不含变量，则继续按“模板正文 + 用户输入”的旧规则兼容执行。</p>
                    </div>
                  </div>
                </FieldCard>
              </div>
            </div>

            <aside className="w-full max-w-[360px] overflow-y-auto pl-1">
              <div className="space-y-5">
                <FieldCard title="发布状态" description="关闭后不会出现在用户端模板选择列表。">
                  <label className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">启用模板</span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => setEnabled(event.target.checked)}
                      className="h-4 w-4 accent-blue-600"
                    />
                  </label>
                </FieldCard>

                <FieldCard
                  title="分类、标签与范围"
                  description="主分类、适用范围和标签都可以在当前弹窗直接维护。"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="prompt-template-category" className="text-sm font-medium text-slate-700">
                        主分类
                      </label>
                      <button
                        type="button"
                        onClick={() => setCategoryManagerOpen(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-500"
                      >
                        管理分类
                      </button>
                    </div>
                    <select
                      id="prompt-template-category"
                      aria-label="主分类"
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                      className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">请选择主分类</option>
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">适用范围</span>
                    <div className="flex flex-wrap gap-2">
                      <PillButton active={scopeMode === "GLOBAL"} onClick={() => setScopeMode("GLOBAL")}>
                        全站通用
                      </PillButton>
                      <PillButton active={scopeMode === "LIMITED"} onClick={() => setScopeMode("LIMITED")}>
                        限定应用
                      </PillButton>
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">默认应用</span>
                    <select
                      value={legacyAppCode}
                      onChange={(event) => setLegacyAppCode(event.target.value)}
                      className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">请选择默认应用</option>
                      {appOptions.map((app) => (
                        <option key={app.code} value={app.code}>
                          {app.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {scopeMode === "LIMITED" ? (
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-700">限定应用</p>
                        <p className="text-xs text-slate-400">至少选择一个</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {appOptions.map((app) => (
                          <PillButton
                            key={app.code}
                            active={scopeAppCodes.includes(app.code)}
                            onClick={() => toggleScopeApp(app.code)}
                          >
                            {app.name}
                          </PillButton>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-700">辅助标签</span>
                      <button
                        type="button"
                        onClick={() => setTagManagerOpen(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-500"
                      >
                        管理标签
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {localTags.length === 0 ? (
                        <div className="rounded-[16px] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-400">
                          还没有标签，先去新增一个吧。
                        </div>
                      ) : (
                        localTags.map((tag) => (
                          <PillButton
                            key={tag.id}
                            active={selectedTags.includes(tag.name)}
                            onClick={() => toggleTag(tag.name)}
                            style={{
                              borderColor: selectedTags.includes(tag.name) ? tag.color : undefined,
                              backgroundColor: selectedTags.includes(tag.name) ? tag.color : undefined,
                            }}
                          >
                            {tag.name}
                          </PillButton>
                        ))
                      )}
                    </div>
                  </div>
                </FieldCard>

                <FieldCard title="执行提醒" description="帮助运营同学快速理解模板最终会怎么工作。">
                  <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                    <p>用户端看到的是模板增强后的输入体验，不会看到后台模板正文。</p>
                    <p className="mt-2">
                      如果应用只有一个主提示词框，优先使用 <span className="font-semibold text-slate-900">{"{{input.prompt}}"}</span>。
                    </p>
                    <p className="mt-2">
                      如果应用未来补充了风格、场景、负面提示词字段，本模板无需改数据库即可继续扩展。
                    </p>
                  </div>
                </FieldCard>
              </div>
            </aside>
          </div>

          {error ? (
            <div className="border-t border-rose-100 bg-rose-50 px-7 py-3 text-sm text-rose-600">{error}</div>
          ) : null}

          <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-7 py-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-full border border-blue-600 bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "保存中..." : isEditing ? "保存模板" : "创建模板"}
            </button>
          </footer>
        </div>
      </div>
      {coverPreviewOpen && coverPreviewUrl ? (
        <ImageLightbox
          assets={[{ id: "prompt-template-cover", name: coverPreviewName, url: coverPreviewUrl }]}
          onClose={() => setCoverPreviewOpen(false)}
        />
      ) : null}
      <FormDialog
        open={tagManagerOpen}
        title="管理提示词标签"
        description="标签会立即同步到当前模板编辑器，便于边维护边选择。"
        confirmLabel={tagDraft.id ? "保存标签" : "新增标签"}
        pending={managerPending === "tag"}
        onClose={() => {
          setTagManagerOpen(false);
          setTagDraft({ id: null, name: "", color: "#2563eb", originalName: null });
          setManagerMessage(null);
        }}
        onSubmit={() => {
          void saveTag();
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">标签名称</span>
          <input
            value={tagDraft.name}
            onChange={(event) => setTagDraft((current) => ({ ...current, name: event.target.value }))}
            className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">标签颜色</span>
          <input
            type="color"
            value={tagDraft.color}
            onChange={(event) => setTagDraft((current) => ({ ...current, color: event.target.value }))}
            className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-2"
          />
        </label>
        <div className="space-y-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm font-medium text-slate-700">现有标签</p>
          <div className="flex flex-wrap gap-2">
            {localTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <button
                  type="button"
                  onClick={() =>
                    setTagDraft({
                      id: tag.id,
                      name: tag.name,
                      color: tag.color,
                      originalName: tag.name,
                    })
                  }
                  className="font-medium hover:text-slate-950"
                  aria-label={`编辑标签 ${tag.name}`}
                >
                  {tag.name}
                </button>
                <button
                  type="button"
                  onClick={() => void removeTag(tag)}
                  disabled={managerPending === `tag-delete-${tag.id}`}
                  className="text-xs font-semibold text-rose-600 disabled:opacity-50"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
        {managerMessage ? <p className="text-sm text-slate-500">{managerMessage}</p> : null}
      </FormDialog>

      <FormDialog
        open={categoryManagerOpen}
        title="管理模板分类"
        description="分类变更会立即刷新右侧主分类下拉，支持新增、编辑、启停和删除。"
        confirmLabel={categoryDraft.id ? "保存分类" : "新增分类"}
        pending={managerPending === "category"}
        onClose={() => {
          setCategoryManagerOpen(false);
          setCategoryDraft({
            id: null,
            name: "",
            color: "#2563eb",
            sortOrder: getNextCategorySortOrder(localCategoriesRef.current),
            enabled: true,
          });
          setManagerMessage(null);
        }}
        onSubmit={() => {
          void saveCategory();
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">分类名称</span>
          <input
            value={categoryDraft.name}
            onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))}
            className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">分类颜色</span>
            <input
              type="color"
              value={categoryDraft.color}
              onChange={(event) => setCategoryDraft((current) => ({ ...current, color: event.target.value }))}
              className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-2"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">排序值</span>
            <input
              type="number"
              value={categoryDraft.sortOrder}
              onChange={(event) =>
                setCategoryDraft((current) => ({
                  ...current,
                  sortOrder: Number(event.target.value) || 0,
                }))
              }
              className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
        <label className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">启用分类</span>
          <input
            type="checkbox"
            checked={categoryDraft.enabled}
            onChange={(event) =>
              setCategoryDraft((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
            className="h-4 w-4 accent-blue-600"
          />
        </label>
        <div className="space-y-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm font-medium text-slate-700">现有分类</p>
          <div className="space-y-2">
            {sortCategories(localCategories).map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <button
                  type="button"
                  onClick={() =>
                    setCategoryDraft({
                      id: category.id,
                      name: category.name,
                      color: category.color,
                      sortOrder: category.sortOrder,
                      enabled: category.enabled,
                    })
                  }
                  className="text-left hover:text-slate-950"
                  aria-label={`编辑分类 ${category.name}`}
                >
                  <span className="font-medium">{category.name}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {category.enabled ? "启用中" : "已停用"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void removeCategory(category)}
                  disabled={managerPending === `category-delete-${category.id}`}
                  className="text-xs font-semibold text-rose-600 disabled:opacity-50"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
        {managerMessage ? <p className="text-sm text-slate-500">{managerMessage}</p> : null}
      </FormDialog>
    </>
  );
}
