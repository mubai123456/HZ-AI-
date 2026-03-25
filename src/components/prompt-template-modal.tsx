"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  PromptTemplateCategoryRecord,
  PromptTemplateSafeRecord,
  PromptTemplateTagRecord,
} from "@/lib/types";

interface Props {
  appCode: string;
  selectedTemplateId: string | null;
  onSelect: (templateId: string, templateName: string) => void;
  onClose: () => void;
}

type TemplateMode = "all" | "recent" | "favorites";
type SortMode = "usage" | "latest";

type PreviewState =
  | { type: "IMAGE"; url: string; name: string }
  | { type: "VIDEO"; url: string; posterUrl: string | null; name: string }
  | null;

const modeLabels: Record<TemplateMode, string> = {
  all: "全部模板",
  recent: "最近使用",
  favorites: "我的收藏",
};

const sortLabels: Record<SortMode, string> = {
  usage: "按使用次数排序",
  latest: "按最新创建排序",
};

function buildUrl(path: string, params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function categoryClass(active: boolean) {
  return active
    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900";
}

function formatTagColor(color: string | undefined, alpha: string) {
  return `${color ?? "#475569"}${alpha}`;
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white/90 transition hover:border-white/25 hover:bg-white/14 hover:text-white"
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.9}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 21-1.45-1.32C5.4 15.02 2 11.94 2 8.17 2 5.09 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6.04 6.04 0 0 1 16.5 3C19.58 3 22 5.09 22 8.17c0 3.77-3.4 6.85-8.55 11.52z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="ml-0.5 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.68L9.54 5.98A1 1 0 0 0 8 6.82Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function RotateLeftIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 4H3v4M3 8a9 9 0 1 1 2.64 6.36" /></svg>;
}
function RotateRightIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 4h4v4m0 0A9 9 0 1 0 18.36 14.36" /></svg>;
}
function FlipHorizontalIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16M6 7l6 5-6 5V7Zm12 0v10l-6-5 6-5Z" /></svg>;
}
function FlipVerticalIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12h16M7 6l5 6 5-6H7Zm0 12h10l-5-6-5 6Z" /></svg>;
}
function ZoomInIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35M11 8v6m-3-3h6m3.5 0a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" /></svg>;
}
function ZoomOutIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35M8 11h6m3.5 0a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" /></svg>;
}
function DownloadIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v11m0 0 4-4m-4 4-4-4M5 21h14" /></svg>;
}

export function PromptTemplateModal({ appCode, selectedTemplateId, onSelect, onClose }: Props) {
  const [items, setItems] = useState<PromptTemplateSafeRecord[]>([]);
  const [tags, setTags] = useState<PromptTemplateTagRecord[]>([]);
  const [categories, setCategories] = useState<PromptTemplateCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<TemplateMode>("all");
  const [sort, setSort] = useState<SortMode>("usage");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [preview, setPreview] = useState<PreviewState>(null);
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);
  const [previewFlipX, setPreviewFlipX] = useState(false);
  const [previewFlipY, setPreviewFlipY] = useState(false);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(1);

  useEffect(() => {
    let alive = true;
    async function loadStaticData() {
      try {
        const [categoryResponse, tagResponse] = await Promise.all([
          fetch(buildUrl("/api/internal/prompt-template-categories", { appCode }), { cache: "no-store" }),
          fetch("/api/internal/prompt-tags", { cache: "no-store" }),
        ]);
        if (!categoryResponse.ok) {
          const data = await categoryResponse.json().catch(() => null);
          throw new Error(data?.error ?? "加载模板分类失败");
        }
        if (!tagResponse.ok) {
          const data = await tagResponse.json().catch(() => null);
          throw new Error(data?.error ?? "加载模板标签失败");
        }
        const categoryData = (await categoryResponse.json()) as { items?: PromptTemplateCategoryRecord[] };
        const tagData = (await tagResponse.json()) as { items?: PromptTemplateTagRecord[] };
        if (!alive) return;
        setCategories(categoryData.items ?? []);
        setTags(tagData.items ?? []);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : "加载提示词模板失败");
      }
    }
    void loadStaticData();
    return () => {
      alive = false;
    };
  }, [appCode]);

  useEffect(() => {
    let alive = true;
    async function loadTemplates() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          buildUrl("/api/internal/prompt-templates", {
            appCode,
            mode,
            category: selectedCategoryId === "all" ? null : selectedCategoryId,
            q: keyword.trim() || null,
            sort,
          }),
          { cache: "no-store" },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "加载提示词模板失败");
        }
        const data = (await response.json()) as { items?: PromptTemplateSafeRecord[] };
        if (!alive) return;
        setItems(data.items ?? []);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : "加载提示词模板失败");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadTemplates();
    return () => {
      alive = false;
    };
  }, [appCode, keyword, mode, selectedCategoryId, sort]);

  useEffect(() => {
    if (!preview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [preview]);

  useEffect(() => {
    if (!preview) {
      setPreviewFlipX(false);
      setPreviewFlipY(false);
      setPreviewRotation(0);
      setPreviewZoom(1);
      setPreviewMessage(null);
    }
  }, [preview]);

  const tagColorMap = useMemo(() => new Map(tags.map((tag) => [tag.name, tag.color])), [tags]);
  const visibleCategories = useMemo(
    () => categories.filter((category) => category.enabled).sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "zh-CN")),
    [categories],
  );
  const previewTransform = useMemo(() => {
    const x = previewFlipX ? -previewZoom : previewZoom;
    const y = previewFlipY ? -previewZoom : previewZoom;
    return `rotate(${previewRotation}deg) scale(${x}, ${y})`;
  }, [previewFlipX, previewFlipY, previewRotation, previewZoom]);

  async function handleFavoriteToggle(item: PromptTemplateSafeRecord) {
    setFavoriteBusyId(item.id);
    try {
      const response = await fetch(`/api/internal/prompt-templates/favorites/${item.id}`, {
        method: item.isFavorite ? "DELETE" : "POST",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "更新收藏失败");
      }
      setItems((current) =>
        current
          .map((template) => (template.id === item.id ? { ...template, isFavorite: !template.isFavorite } : template))
          .filter((template) => !(mode === "favorites" && !template.isFavorite)),
      );
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "更新收藏失败");
    } finally {
      setFavoriteBusyId(null);
    }
  }

  function openPreview(nextPreview: PreviewState) {
    setPreviewMessage(null);
    setPreview(nextPreview);
  }

  function closePreview() {
    setPreview(null);
  }

  function zoomBy(delta: number) {
    setPreviewZoom((current) => {
      const nextValue = Number((current + delta).toFixed(2));
      return Math.min(3, Math.max(0.5, nextValue));
    });
  }

  async function downloadOriginalImage(url: string, filename: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("下载原图失败");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${filename || "template-preview"}.png`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function downloadProcessedImage(url: string, filename: string) {
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const target = new Image();
        target.crossOrigin = "anonymous";
        target.onload = () => resolve(target);
        target.onerror = reject;
        target.src = url;
      });
      const quarterTurns = ((previewRotation / 90) % 4 + 4) % 4;
      const swapSides = quarterTurns % 2 === 1;
      const canvas = document.createElement("canvas");
      canvas.width = swapSides ? image.naturalHeight : image.naturalWidth;
      canvas.height = swapSides ? image.naturalWidth : image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("当前浏览器不支持导出处理后的效果图");
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((previewRotation * Math.PI) / 180);
      context.scale(previewFlipX ? -previewZoom : previewZoom, previewFlipY ? -previewZoom : previewZoom);
      context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2, image.naturalWidth, image.naturalHeight);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${filename || "template-preview"}-edited.png`;
      link.click();
    } catch {
      setPreviewMessage("当前图片源不支持导出处理后的效果图");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/28 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="flex h-[88vh] w-full max-w-[1680px] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.22)]" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-slate-200 px-8 py-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-blue-600">提示词模板</p>
              <h2 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">选择提示词模板</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">选择一个模板后，你仍然可以继续输入自己的提示词。系统会在服务端自动拼接模板提示词和你的输入。</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-700" aria-label="关闭提示词模板弹窗"><CloseIcon /></button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="min-w-[360px] flex-1">
              <div className="flex h-12 items-center rounded-full border border-slate-200 bg-slate-50 pl-4 pr-2">
                <SearchIcon />
                <input type="search" value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setKeyword(keywordInput.trim()); }} placeholder="搜索模板名称、分类或用途" className="ml-3 h-full w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
                <button type="button" onClick={() => setKeyword(keywordInput.trim())} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500">搜索</button>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
              {(Object.keys(modeLabels) as TemplateMode[]).map((entryMode) => (
                <button key={entryMode} type="button" onClick={() => setMode(entryMode)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === entryMode ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>{modeLabels[entryMode]}</button>
              ))}
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-12 rounded-full border border-slate-200 bg-white px-5 text-sm text-slate-600 outline-none transition hover:border-slate-300" aria-label="提示词模板排序方式">
              {(Object.keys(sortLabels) as SortMode[]).map((entrySort) => (<option key={entrySort} value={entrySort}>{sortLabels[entrySort]}</option>))}
            </select>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => setSelectedCategoryId("all")} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${categoryClass(selectedCategoryId === "all")}`}>全部分类</button>
            {visibleCategories.map((category) => (<button key={category.id} type="button" onClick={() => setSelectedCategoryId(category.id)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${categoryClass(selectedCategoryId === category.id)}`}>{category.name}</button>))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50/45 px-8 py-6">
          {loading ? (
            <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">正在加载提示词模板...</div>
          ) : error ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">当前筛选条件下没有可用模板。</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {items.map((item) => {
                const isSelected = selectedTemplateId === item.id;
                const imageUrl = item.coverImageUrl ?? item.samplePosterUrl ?? item.sampleMediaUrl;
                const visibleTags = item.tags.slice(0, 2);
                const hiddenTagCount = item.tags.length - visibleTags.length;
                return (
                  <article key={item.id} className={`flex min-h-[344px] flex-col overflow-hidden rounded-[24px] border bg-white shadow-sm transition ${isSelected ? "border-blue-300 shadow-[0_16px_48px_rgba(37,99,235,0.16)]" : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)]"}`}>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-b-[20px] bg-slate-100">
                      {item.sampleMediaType === "VIDEO" ? (
                        <div className="group relative h-full w-full">
                          {imageUrl ? <img src={imageUrl} alt={`${item.name} 视频封面`} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#1e293b,#0f172a_65%)] text-slate-200"><div className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.14em]">VIDEO</div></div>}
                          <div className="absolute inset-x-0 top-3 flex items-center justify-between px-3">
                            <span className="rounded-full bg-slate-950/72 px-2.5 py-1 text-[11px] font-semibold text-white">视频模板</span>
                            <button type="button" disabled={favoriteBusyId === item.id} onClick={(event) => { event.stopPropagation(); void handleFavoriteToggle(item); }} className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition ${item.isFavorite ? "border-rose-200 bg-rose-50 text-rose-500 hover:border-rose-300 hover:text-rose-600" : "border-rose-100 bg-white/95 text-rose-300 hover:border-rose-200 hover:text-rose-500"}`} aria-label={item.isFavorite ? "取消收藏模板" : "收藏模板"}><HeartIcon filled={item.isFavorite} /></button>
                          </div>
                          <button type="button" onClick={() => item.sampleMediaUrl ? openPreview({ type: "VIDEO", url: item.sampleMediaUrl, posterUrl: item.samplePosterUrl ?? item.coverImageUrl, name: item.name }) : undefined} className="absolute inset-0 flex items-center justify-center" aria-label={`预览 ${item.name} 视频示例`}>
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/92 text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.24)] transition hover:scale-105"><PlayIcon /></span>
                          </button>
                        </div>
                      ) : (
                        <div className="group relative h-full w-full bg-slate-50">
                          {imageUrl ? <button type="button" onClick={() => openPreview({ type: "IMAGE", url: item.sampleMediaUrl ?? imageUrl, name: item.name })} className="h-full w-full" aria-label={`查看 ${item.name} 大图`}><img src={imageUrl} alt={`${item.name} 示例图`} className="h-full w-full object-contain" /></button> : <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">TEMPLATE</div>}
                          <div className="absolute inset-x-0 top-3 flex items-center justify-between px-3">
                            <span className="rounded-full bg-slate-950/72 px-2.5 py-1 text-[11px] font-semibold text-white">图片模板</span>
                            <button type="button" disabled={favoriteBusyId === item.id} onClick={(event) => { event.stopPropagation(); void handleFavoriteToggle(item); }} className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition ${item.isFavorite ? "border-rose-200 bg-rose-50 text-rose-500 hover:border-rose-300 hover:text-rose-600" : "border-rose-100 bg-white/95 text-rose-300 hover:border-rose-200 hover:text-rose-500"}`} aria-label={item.isFavorite ? "取消收藏模板" : "收藏模板"}><HeartIcon filled={item.isFavorite} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-950">{item.name}</h3><p className="mt-1 text-[11px] text-slate-400">真实运行 {item.usageCount} 次</p></div>
                        {item.categoryName ? <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: formatTagColor(item.categoryColor ?? "#2563eb", "16"), color: item.categoryColor ?? "#2563eb" }}>{item.categoryName}</span> : null}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.description || "适合直接带入当前应用，选中后继续补充自己的提示词。"}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {visibleTags.map((tagName) => <span key={`${item.id}-${tagName}`} className="rounded-full px-2 py-1 text-[10px] font-medium" style={{ backgroundColor: formatTagColor(tagColorMap.get(tagName), "14"), color: tagColorMap.get(tagName) ?? "#475569" }}>{tagName}</span>)}
                        {hiddenTagCount > 0 ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">+{hiddenTagCount}</span> : null}
                      </div>
                      <button type="button" onClick={() => onSelect(item.id, item.name)} className={`mt-auto rounded-full px-4 py-2 text-sm font-semibold transition ${isSelected ? "bg-blue-50 text-blue-700 hover:bg-blue-100" : "bg-blue-600 text-white hover:bg-blue-500"}`}>{isSelected ? "重新确认模板" : "使用"}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {preview ? (
        <div data-testid={preview.type === "IMAGE" ? "image-preview-overlay" : "video-preview-overlay"} className="fixed inset-0 z-[60] bg-black/80" onClick={closePreview}>
          {preview.type === "IMAGE" ? (
            <>
              <button type="button" onClick={(event) => { event.stopPropagation(); closePreview(); }} className="absolute right-6 top-6 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/95 text-slate-500 shadow-lg transition hover:text-slate-800" aria-label="关闭图片预览"><CloseIcon /></button>
              {previewMessage ? <div className="absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 shadow-lg">{previewMessage}</div> : null}
              <aside className="absolute inset-y-0 right-0 z-10 flex w-20 flex-col items-center gap-3 border-l border-white/10 bg-black/45 px-3 py-24 backdrop-blur-sm" onClick={(event) => event.stopPropagation()} aria-label="图片查看工具栏">
                <ActionButton label="上下镜像" onClick={() => setPreviewFlipY((current) => !current)}><FlipVerticalIcon /></ActionButton>
                <ActionButton label="左右镜像" onClick={() => setPreviewFlipX((current) => !current)}><FlipHorizontalIcon /></ActionButton>
                <ActionButton label="向左旋转" onClick={() => setPreviewRotation((current) => current - 90)}><RotateLeftIcon /></ActionButton>
                <ActionButton label="向右旋转" onClick={() => setPreviewRotation((current) => current + 90)}><RotateRightIcon /></ActionButton>
                <ActionButton label="放大" onClick={() => zoomBy(0.2)}><ZoomInIcon /></ActionButton>
                <ActionButton label="缩小" onClick={() => zoomBy(-0.2)}><ZoomOutIcon /></ActionButton>
                <ActionButton label="下载原图" onClick={() => void downloadOriginalImage(preview.url, preview.name)}><DownloadIcon /></ActionButton>
                <ActionButton label="下载当前效果图" onClick={() => void downloadProcessedImage(preview.url, preview.name)}><DownloadIcon /></ActionButton>
                <ActionButton label="关闭" onClick={closePreview}><CloseIcon /></ActionButton>
                <div className="mt-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">{Math.round(previewZoom * 100)}%</div>
              </aside>
              <div className="absolute inset-0 pr-24" data-testid="image-preview-blank" onClick={closePreview}>
                <div className="pointer-events-none flex h-full w-full items-center justify-center p-4 sm:p-6" role="dialog" aria-label="模板示例图片预览">
                  <div className="pointer-events-none h-[calc(100vh-32px)] w-[calc(100vw-128px)] max-h-[calc(100vh-32px)] max-w-[calc(100vw-128px)]">
                    <img
                      data-testid="image-preview-image"
                      src={preview.url}
                      alt={`${preview.name} 大图预览`}
                      className="pointer-events-auto h-full w-full select-none object-contain"
                      onClick={(event) => event.stopPropagation()}
                      style={{ transform: previewTransform, transformOrigin: "center center" }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-6" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={closePreview} className="absolute right-6 top-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/92 text-slate-500 shadow-lg transition hover:text-slate-800" aria-label="关闭视频预览"><CloseIcon /></button>
              <div className="w-full max-w-6xl overflow-hidden rounded-[28px] bg-black shadow-[0_32px_120px_rgba(15,23,42,0.35)]" role="dialog" aria-label="模板示例视频预览">
                <video controls autoPlay poster={preview.posterUrl ?? undefined} className="max-h-[88vh] w-full bg-black"><source src={preview.url} /></video>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
