"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PromptTemplateModal } from "@/components/prompt-template-modal";
import type { AppDefinition, AppInputField, TaskRecord } from "@/lib/types";

interface Props {
  app: AppDefinition;
  onSubmitSuccess?: (taskId: string) => void;
  reuseTaskRequest?: { task: TaskRecord; nonce: number } | null;
}

type LocalImageState = {
  file?: File;
  preview: string;
  isRemote?: boolean;
  name?: string;
};

type DraftSnapshot = {
  formData?: Record<string, string | string[]>;
  uploadedUrls?: Record<string, string>;
  imagePreviews?: Record<string, { preview: string; name?: string }>;
  selectedTemplateId?: string | null;
  selectedTemplateName?: string | null;
  showAdvancedParams?: boolean;
};

type FormState = {
  formData: Record<string, string | string[]>;
  images: Record<string, LocalImageState>;
  uploadedUrls: Record<string, string>;
  selectedTemplateId: string | null;
  selectedTemplateName: string | null;
  showAdvancedParams: boolean;
};

function getDraftStorageKey(appCode: string) {
  return `app-workbench-draft:${appCode}`;
}

function createDefaultFormData(app: AppDefinition) {
  const nextFormData: Record<string, string | string[]> = {};

  for (const field of app.formSchemaJson) {
    if (field.hidden) {
      continue;
    }

    if (field.type === "select") {
      nextFormData[field.key] = app.defaultParamsJson[field.key] ?? field.options?.[0]?.value ?? "";
      continue;
    }

    if (field.type === "textarea") {
      nextFormData[field.key] = app.defaultParamsJson[field.key] ?? "";
    }
  }

  return nextFormData;
}

function buildHiddenFieldDefaults(app: AppDefinition) {
  return app.formSchemaJson.reduce<Record<string, string>>((acc, field) => {
    if (!field.hidden) {
      return acc;
    }

    acc[field.key] = app.defaultParamsJson[field.key] ?? "";
    return acc;
  }, {});
}

function splitSelectFields(fields: AppInputField[]) {
  return {
    primary: fields.slice(0, 2),
    secondary: fields.slice(2),
  };
}

function revokePreview(preview?: string) {
  if (preview?.startsWith("blob:")) {
    URL.revokeObjectURL(preview);
  }
}

function restoreImagesFromDraft(
  app: AppDefinition,
  uploadedUrls: Record<string, string>,
  imagePreviews?: Record<string, { preview: string; name?: string }>,
) {
  const nextImages: Record<string, LocalImageState> = {};

  for (const field of app.formSchemaJson.filter((item) => item.type === "image" && !item.hidden)) {
    const preview = imagePreviews?.[field.key]?.preview ?? uploadedUrls[field.key];
    if (!preview) {
      continue;
    }

    nextImages[field.key] = {
      preview,
      isRemote: true,
      name: imagePreviews?.[field.key]?.name ?? field.label,
    };
  }

  return nextImages;
}

function createDefaultState(app: AppDefinition): FormState {
  const formData = createDefaultFormData(app);

  return {
    formData,
    images: {},
    uploadedUrls: {},
    selectedTemplateId: null,
    selectedTemplateName: null,
    showAdvancedParams: false,
  };
}

function readDraftState(app: AppDefinition): FormState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(app.code));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as DraftSnapshot;
    const fallback = createDefaultState(app);
    const nextUploadedUrls = parsed.uploadedUrls ?? {};

    return {
      formData: { ...fallback.formData, ...(parsed.formData ?? {}) },
      images: restoreImagesFromDraft(app, nextUploadedUrls, parsed.imagePreviews),
      uploadedUrls: nextUploadedUrls,
      selectedTemplateId: parsed.selectedTemplateId ?? null,
      selectedTemplateName: parsed.selectedTemplateName ?? null,
      showAdvancedParams: parsed.showAdvancedParams ?? false,
    };
  } catch {
    return null;
  }
}

function buildImagePreviewDraft(
  images: Record<string, LocalImageState>,
  uploadedUrls: Record<string, string>,
) {
  const next: Record<string, { preview: string; name?: string }> = {};

  for (const [fieldKey, image] of Object.entries(images)) {
    const preview = uploadedUrls[fieldKey] ?? (image.isRemote ? image.preview : undefined);
    if (!preview) {
      continue;
    }

    next[fieldKey] = {
      preview,
      name: image.name,
    };
  }

  return next;
}

function buildTaskImageState(task: TaskRecord, imageFields: AppInputField[]) {
  const nextImages: Record<string, LocalImageState> = {};
  const nextUploadedUrls: Record<string, string> = {};
  const matchedAssetIds = new Set<string>();

  for (const [index, field] of imageFields.entries()) {
    const slottedAsset =
      task.inputAssets.find((asset) => asset.sourceSlot === field.key) ??
      (index === 0 ? task.inputAssets[0] : undefined);
    const providerUrl =
      (typeof task.params[field.key] === "string" ? task.params[field.key] : undefined) ??
      slottedAsset?.url;
    const previewUrl = slottedAsset?.url ?? providerUrl;

    if (!providerUrl || !previewUrl) {
      continue;
    }

    if (slottedAsset) {
      matchedAssetIds.add(slottedAsset.id);
    }

    nextUploadedUrls[field.key] = providerUrl;
    nextImages[field.key] = {
      preview: previewUrl,
      isRemote: true,
      name: slottedAsset?.name ?? field.label,
    };
  }

  for (const asset of task.inputAssets) {
    if (matchedAssetIds.has(asset.id)) {
      continue;
    }

    const emptyField = imageFields.find((field) => !nextUploadedUrls[field.key]);
    if (!emptyField) {
      break;
    }

    nextUploadedUrls[emptyField.key] = asset.url;
    nextImages[emptyField.key] = {
      preview: asset.url,
      isRemote: true,
      name: asset.name ?? emptyField.label,
    };
  }

  return { nextImages, nextUploadedUrls };
}

export function SubmitForm({ app, onSubmitSuccess, reuseTaskRequest }: Props) {
  const initialState = useMemo(() => createDefaultState(app), [app]);
  const defaultFormData = useMemo(() => createDefaultFormData(app), [app]);
  const hiddenFieldDefaults = useMemo(() => buildHiddenFieldDefaults(app), [app]);

  const [formData, setFormData] = useState<Record<string, string | string[]>>(initialState.formData);
  const [images, setImages] = useState<Record<string, LocalImageState>>(initialState.images);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>(initialState.uploadedUrls);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialState.selectedTemplateId);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(initialState.selectedTemplateName);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAdvancedParams, setShowAdvancedParams] = useState(initialState.showAdvancedParams);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const imagesRef = useRef<Record<string, LocalImageState>>(initialState.images);
  const skipNextDraftSaveRef = useRef(false);

  const visibleFields = useMemo(
    () => app.formSchemaJson.filter((field) => !field.hidden),
    [app.formSchemaJson],
  );
  const imageFields = useMemo(
    () => visibleFields.filter((field) => field.type === "image"),
    [visibleFields],
  );
  const selectFields = useMemo(
    () => visibleFields.filter((field) => field.type === "select"),
    [visibleFields],
  );
  const textareaFields = useMemo(
    () => visibleFields.filter((field) => field.type === "textarea"),
    [visibleFields],
  );
  const primaryTextarea = textareaFields[0] ?? null;
  const { primary: primarySelectFields, secondary: secondarySelectFields } = useMemo(
    () => splitSelectFields(selectFields),
    [selectFields],
  );
  const draftStorageKey = useMemo(() => getDraftStorageKey(app.code), [app.code]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextState = readDraftState(app) ?? createDefaultState(app);

    setFormData(nextState.formData);
    setImages((current) => {
      for (const image of Object.values(current)) {
        revokePreview(image.preview);
      }

      return nextState.images;
    });
    setUploadedUrls(nextState.uploadedUrls);
    setSelectedTemplateId(nextState.selectedTemplateId);
    setSelectedTemplateName(nextState.selectedTemplateName);
    setShowAdvancedParams(nextState.showAdvancedParams);
    setDraftHydrated(true);
  }, [app, draftStorageKey]);

  useEffect(() => {
    return () => {
      for (const image of Object.values(imagesRef.current)) {
        revokePreview(image.preview);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!draftHydrated) {
      return;
    }

    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }

    const snapshot: DraftSnapshot = {
      formData,
      uploadedUrls,
      imagePreviews: buildImagePreviewDraft(images, uploadedUrls),
      selectedTemplateId,
      selectedTemplateName,
      showAdvancedParams,
    };

    window.localStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
  }, [
    draftStorageKey,
    formData,
    images,
    selectedTemplateId,
    selectedTemplateName,
    showAdvancedParams,
    uploadedUrls,
    draftHydrated,
  ]);

  const resetFileInputs = useCallback(() => {
    for (const input of Object.values(fileInputRefs.current)) {
      if (input) {
        input.value = "";
      }
    }
  }, []);

  const openFilePicker = useCallback((fieldKey: string) => {
    const input = fileInputRefs.current[fieldKey];
    if (!input) {
      return;
    }

    input.value = "";
    input.click();
  }, []);

  const handleImageSelect = useCallback(
    async (fieldKey: string, files: FileList | null) => {
      if (!files?.length) {
        return;
      }

      const nextFile = files[0];
      const nextPreview = URL.createObjectURL(nextFile);
      const previousImage = imagesRef.current[fieldKey];
      const previousUploadedUrl = uploadedUrls[fieldKey];

      setImages((current) => ({
        ...current,
        [fieldKey]: {
          file: nextFile,
          preview: nextPreview,
          name: nextFile.name,
        },
      }));
      setUploading((current) => ({ ...current, [fieldKey]: true }));
      setSubmitError(null);
      setSubmitSuccess(null);

      try {
        const payload = new FormData();
        payload.append("file", nextFile);

        const response = await fetch("/api/internal/upload", {
          method: "POST",
          body: payload,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "图片上传失败");
        }

        const data = await response.json();
        setUploadedUrls((current) => ({
          ...current,
          [fieldKey]: data.url,
        }));

        if (previousImage?.preview !== nextPreview) {
          revokePreview(previousImage?.preview);
        }
      } catch (error) {
        revokePreview(nextPreview);

        setImages((current) => {
          const next = { ...current };
          if (previousImage) {
            next[fieldKey] = previousImage;
          } else {
            delete next[fieldKey];
          }
          return next;
        });

        setUploadedUrls((current) => {
          const next = { ...current };
          if (previousUploadedUrl) {
            next[fieldKey] = previousUploadedUrl;
          } else {
            delete next[fieldKey];
          }
          return next;
        });

        setSubmitError(error instanceof Error ? error.message : "图片上传失败");
      } finally {
        setUploading((current) => ({ ...current, [fieldKey]: false }));
        const input = fileInputRefs.current[fieldKey];
        if (input) {
          input.value = "";
        }
      }
    },
    [uploadedUrls],
  );

  const handleClearDraft = useCallback(() => {
    for (const image of Object.values(imagesRef.current)) {
      revokePreview(image.preview);
    }

    setFormData(defaultFormData);
    setImages({});
    setUploadedUrls({});
    setUploading({});
    setSelectedTemplateId(null);
    setSelectedTemplateName(null);
    setShowAdvancedParams(false);
    setSubmitError(null);
    setSubmitSuccess(null);
    resetFileInputs();

    if (typeof window !== "undefined") {
      skipNextDraftSaveRef.current = true;
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [defaultFormData, draftStorageKey, resetFileInputs]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload: Record<string, string | string[]> = {
        ...hiddenFieldDefaults,
        ...formData,
      };

      for (const [fieldKey, url] of Object.entries(uploadedUrls)) {
        payload[fieldKey] = url;
      }

      const response = await fetch("/api/internal/tasks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appCode: app.code,
          formData: payload,
          selectedPromptTemplateId: selectedTemplateId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "提交任务失败");
      }

      const data = await response.json();
      setSubmitSuccess(`任务已提交：${data.taskNo}`);
      onSubmitSuccess?.(data.taskId);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "提交任务失败");
    } finally {
      setSubmitting(false);
    }
  }, [app.code, formData, hiddenFieldDefaults, onSubmitSuccess, selectedTemplateId, uploadedUrls]);

  const applyTaskRequest = useCallback(
    (task: TaskRecord) => {
      const nextFormData = createDefaultFormData(app);

      textareaFields.forEach((field, index) => {
        const taskValue = task.params[field.key];
        if (index === 0) {
          nextFormData[field.key] = task.prompt || taskValue || "";
          return;
        }

        if (taskValue) {
          nextFormData[field.key] = taskValue;
        }
      });

      selectFields.forEach((field) => {
        const taskValue = task.params[field.key];
        if (typeof taskValue === "string") {
          nextFormData[field.key] = taskValue;
        }
      });

      const { nextImages, nextUploadedUrls } = buildTaskImageState(task, imageFields);

      for (const image of Object.values(imagesRef.current)) {
        revokePreview(image.preview);
      }

      setFormData(nextFormData);
      setImages(nextImages);
      setUploadedUrls(nextUploadedUrls);
      setUploading({});
      setSelectedTemplateId(null);
      setSelectedTemplateName(null);
      setShowAdvancedParams(
        secondarySelectFields.some((field) => (nextFormData[field.key] as string) !== (defaultFormData[field.key] as string)),
      );
      setSubmitError(null);
      setSubmitSuccess("已回填最近任务输入，可以继续微调后再次提交。");
      resetFileInputs();
    },
    [app, defaultFormData, imageFields, resetFileInputs, secondarySelectFields, selectFields, textareaFields],
  );

  useEffect(() => {
    if (!reuseTaskRequest?.task) {
      return;
    }

    applyTaskRequest(reuseTaskRequest.task);
  }, [applyTaskRequest, reuseTaskRequest]);

  const hasUploadingImages = Object.values(uploading).some(Boolean);
  const submitPriceLabel = app.estimatedPriceLabel.replace(/^¥/, "￥");

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="space-y-4 pb-5">
          {imageFields.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <SectionHeader title="参考图输入" description="三列并排展示，首张图作为主参考图。" />
                <button
                  type="button"
                  onClick={handleClearDraft}
                  aria-label="clear-draft"
                  className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                >
                  清空
                </button>
              </div>

              <div data-testid="image-upload-grid" className="grid grid-cols-3 gap-3">
                {imageFields.map((field, index) => (
                  <ImageUploadField
                    key={field.key}
                    field={field}
                    preview={images[field.key]}
                    isUploading={uploading[field.key]}
                    isPrimary={index === 0}
                    setRef={(element) => {
                      fileInputRefs.current[field.key] = element;
                    }}
                    onPick={() => openFilePicker(field.key)}
                    onChange={(files) => void handleImageSelect(field.key, files)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {primaryTextarea ? (
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <SectionHeader
                  title={primaryTextarea.label}
                  description="先写清核心目标，需要时再套用模板或补充更多参数。"
                />
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                >
                  <TemplateIcon />
                  提示词模板
                </button>
              </div>

              {selectedTemplateName ? (
                <div className="flex items-center gap-2 rounded-[16px] border border-blue-200 bg-blue-50 px-3 py-3 text-xs text-blue-700">
                  <SuccessIcon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">已选模板：{selectedTemplateName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(null);
                      setSelectedTemplateName(null);
                    }}
                    className="font-medium text-blue-700 transition hover:text-blue-900"
                  >
                    清空模板
                  </button>
                </div>
              ) : null}

              <textarea
                rows={6}
                placeholder={primaryTextarea.description || `请输入${primaryTextarea.label}...`}
                value={(formData[primaryTextarea.key] as string) ?? ""}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    [primaryTextarea.key]: event.target.value,
                  }))
                }
                className="min-h-[160px] w-full resize-y rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              />
              <p className="text-[11px] leading-5 text-slate-400">
                提交后不会清空，方便你继续沿着当前输入做增量微调。
              </p>
            </section>
          ) : null}

          {primarySelectFields.length > 0 ? (
            <section className="space-y-3">
              <SectionHeader title="关键参数" description="首屏只保留高频参数，低频项收进折叠区。" />
              <div className="grid grid-cols-2 gap-3">
                {primarySelectFields.map((field) => (
                  <SelectField
                    key={field.key}
                    field={field}
                    value={(formData[field.key] as string) ?? ""}
                    onChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        [field.key]: value,
                      }))
                    }
                  />
                ))}
              </div>

              {secondarySelectFields.length > 0 ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedParams((value) => !value)}
                    aria-label="toggle-advanced-params"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    {showAdvancedParams ? "收起更多参数" : "展开更多参数"}
                    <ChevronIcon expanded={showAdvancedParams} />
                  </button>

                  {showAdvancedParams ? (
                    <div className="grid max-h-[240px] grid-cols-2 gap-3 overflow-y-auto pr-1">
                      {secondarySelectFields.map((field) => (
                        <SelectField
                          key={field.key}
                          field={field}
                          value={(formData[field.key] as string) ?? ""}
                          onChange={(value) =>
                            setFormData((current) => ({
                              ...current,
                              [field.key]: value,
                            }))
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-3">
            <SectionHeader title="提交反馈" description="上传、校验和提交状态都会在这里就地显示。" />
            {submitError ? (
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {submitError}
              </div>
            ) : null}
            {submitSuccess ? (
              <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {submitSuccess}
              </div>
            ) : null}
            {!submitError && !submitSuccess ? (
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                {submitting ? "正在创建任务并同步到结果区..." : "确认输入后直接提交，结果会在中间主画布就地更新。"}
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 px-4 py-4 backdrop-blur sm:px-5">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          aria-label="submit-task"
          data-testid="submit-task-button"
          disabled={submitting || hasUploadingImages}
          className="flex w-full flex-col items-center justify-center rounded-[24px] bg-[#0066DD] px-5 py-4 text-center text-white shadow-sm transition hover:bg-[#0055BB] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-base font-semibold">
            {submitting ? "提交中..." : hasUploadingImages ? "等待上传完成" : "提交任务"}
          </span>
          <span className="mt-1 text-xs font-medium text-white/85">预计{submitPriceLabel}元</span>
        </button>
      </div>

      {showTemplateModal ? (
        <PromptTemplateModal
          appCode={app.code}
          selectedTemplateId={selectedTemplateId}
          onSelect={(templateId, templateName) => {
            setSelectedTemplateId(templateId);
            setSelectedTemplateName(templateName);
            setShowTemplateModal(false);
          }}
          onClose={() => setShowTemplateModal(false)}
        />
      ) : null}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: AppInputField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{field.label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
      >
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ImageUploadField({
  field,
  preview,
  isUploading,
  isPrimary = false,
  setRef,
  onPick,
  onChange,
}: {
  field: AppInputField;
  preview?: LocalImageState;
  isUploading?: boolean;
  isPrimary?: boolean;
  setRef: (element: HTMLInputElement | null) => void;
  onPick: () => void;
  onChange: (files: FileList | null) => void;
}) {
  return (
    <div
      data-testid={`image-upload-slot-${field.key}`}
      data-slot-role={isPrimary ? "primary" : "secondary"}
      className="space-y-2"
    >
      <input
        ref={setRef}
        type="file"
        accept="image/*"
        multiple={false}
        className="hidden"
        onChange={(event) => onChange(event.target.files)}
      />

      {preview ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={field.label}
          onClick={onPick}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onPick();
            }
          }}
          className={`relative block aspect-square w-full cursor-pointer overflow-hidden rounded-[24px] border text-left transition hover:opacity-95 ${
            isPrimary
              ? "border-sky-200 bg-sky-50 ring-1 ring-sky-100"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.preview} alt={field.label} className="h-full w-full object-cover" />
          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 text-sm font-medium text-white">
              上传中...
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          aria-label={field.label}
          onClick={onPick}
          className={`flex aspect-square w-full items-center justify-center rounded-[24px] border border-dashed px-3 py-4 text-center transition ${
            isPrimary
              ? "border-sky-300 bg-sky-50 hover:border-sky-400 hover:bg-sky-100"
              : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
          }`}
        >
          <UploadIcon className="h-6 w-6" />
        </button>
      )}

      <div className="flex justify-center">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isPrimary ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200" : "bg-slate-100 text-slate-500"
          }`}
        >
          {isPrimary ? "主参考图" : "辅助图"}
        </span>
      </div>
    </div>
  );
}

function UploadIcon({ className }: { className: string }) {
  return (
    <svg className={`${className} text-slate-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
      />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5Zm0 8a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6Zm12 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-6Z"
      />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SuccessIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 12 2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

