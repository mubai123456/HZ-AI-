"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { MaterialHallItem, MaterialHallTagSummary, MaterialQuotaRecord } from "@/lib/types";

function formatDuration(durationMs: number | null) {
  if (!durationMs) {
    return "待识别";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatUploadDate(value: string) {
  return `${new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(value))} 上传`;
}

function createQueryString(search: string, tag: string) {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set("q", search.trim());
  }
  if (tag.trim()) {
    params.set("tag", tag.trim());
  }
  return params.toString();
}

function PreviewBadge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-950/76 px-2.5 py-1 text-[11px] font-semibold text-white">{children}</span>;
}

function MaterialCardArtwork({ title }: { title: string }) {
  const accent = title.trim().slice(0, 1).toUpperCase() || "A";

  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#38bdf8_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.42),transparent_48%)]" />
      <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/12 text-xl font-semibold text-white/92 shadow-lg shadow-black/20">
        {accent}
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <p className="line-clamp-2 text-sm font-semibold text-white/90 sm:text-base">{title}</p>
      </div>
    </>
  );
}

function canHoverPreview() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function MaterialHallClient({
  initialItems,
  initialQuota,
  availableTags,
  initialSearch,
  initialTag,
  embedded = false,
}: {
  initialItems: MaterialHallItem[];
  initialQuota: MaterialQuotaRecord;
  availableTags: MaterialHallTagSummary[];
  initialSearch: string;
  initialTag: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const inlineVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const visibleRatiosRef = useRef<Record<string, number>>({});

  const [items, setItems] = useState(initialItems);
  const [quota, setQuota] = useState(initialQuota);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [activeTag, setActiveTag] = useState(initialTag);
  const [message, setMessage] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [previewingItem, setPreviewingItem] = useState<MaterialHallItem | null>(null);
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
  const [activeInlineId, setActiveInlineId] = useState<string | null>(null);
  const [inlinePreviewFailures, setInlinePreviewFailures] = useState<Record<string, boolean>>({});
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [hideMobileFilters, setHideMobileFilters] = useState(false);

  const visibleTags = useMemo(() => availableTags.slice(0, 12), [availableTags]);

  useEffect(() => {
    try {
      setSoundEnabled(window.sessionStorage.getItem("material-hall-sound") === "on");
    } catch {
      setSoundEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncMobileFilterVisibility = () => {
      const isMobileViewport = window.innerWidth < 640;
      setHideMobileFilters(isMobileViewport && window.scrollY > 72);
    };

    syncMobileFilterVisibility();
    window.addEventListener("scroll", syncMobileFilterVisibility, { passive: true });
    window.addEventListener("resize", syncMobileFilterVisibility);
    return () => {
      window.removeEventListener("scroll", syncMobileFilterVisibility);
      window.removeEventListener("resize", syncMobileFilterVisibility);
    };
  }, []);

  useEffect(() => {
    setItems(initialItems);
    setQuota(initialQuota);
  }, [initialItems, initialQuota]);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          const materialId = element.dataset.materialId;
          if (!materialId) {
            continue;
          }
          visibleRatiosRef.current[materialId] = entry.isIntersecting ? entry.intersectionRatio : 0;
        }

        const nextActiveId =
          Object.entries(visibleRatiosRef.current)
            .filter(([, ratio]) => ratio > 0.35)
            .sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;

        setActiveInlineId(nextActiveId);
      },
      {
        threshold: [0.35, 0.6, 0.9],
      },
    );

    for (const item of items) {
      const card = cardRefs.current[item.id];
      if (card) {
        observer.observe(card);
      }
    }

    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    for (const item of items) {
      const video = inlineVideoRefs.current[item.id];
      if (!video) {
        continue;
      }

      const isActive = item.id === activeInlineId && Boolean(item.previewUrl) && !inlinePreviewFailures[item.id];
      video.muted = !soundEnabled;
      video.dataset.active = isActive ? "true" : "false";

      if (isActive) {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => undefined);
        }
        continue;
      }

      video.pause();
    }
  }, [activeInlineId, inlinePreviewFailures, items, soundEnabled]);

  function pushFilters(nextSearch: string, nextTag: string) {
    const query = createQueryString(nextSearch, nextTag);
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushFilters(searchInput, activeTag);
  }

  function handleTagClick(tagName: string) {
    const nextTag = activeTag === tagName ? "" : tagName;
    setActiveTag(nextTag);
    pushFilters(searchInput, nextTag);
  }

  function handleClearFilters() {
    setSearchInput("");
    setActiveTag("");
    pushFilters("", "");
  }

  async function handleClaim(materialId: string) {
    setClaimingId(materialId);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/materials/${materialId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimRequestId: crypto.randomUUID(),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.error === "already_claimed") {
          setItems((current) => current.filter((item) => item.id !== materialId));
          if (previewingItem?.id === materialId) {
            setPreviewingItem(null);
          }
          setMessage("这条素材已被其他用户领取。");
          return;
        }

        if (data?.error === "quota_exceeded") {
          setMessage("今日领取额度已用完。");
          return;
        }

        setMessage("领取失败，请稍后重试。");
        return;
      }

      setItems((current) => current.filter((item) => item.id !== materialId));
      setQuota((current) => ({
        ...current,
        usedCount: Math.min(current.usedCount + (data.idempotent ? 0 : 1), current.limitCount),
        remainingCount: Math.max(current.remainingCount - (data.idempotent ? 0 : 1), 0),
      }));

      if (data.download?.url) {
        window.location.href = data.download.url;
        setMessage("领取成功，已开始下载素材。");
      } else {
        setMessage("领取成功，素材已进入“我的素材”。");
      }

      if (previewingItem?.id === materialId) {
        setPreviewingItem(null);
      }
    } catch {
      setMessage("网络异常，领取失败。");
    } finally {
      setClaimingId(null);
    }
  }

  function openPreview(item: MaterialHallItem) {
    setPreviewingItem(item);
    setPreviewLoadFailed(false);
    setMessage(null);
  }

  function closePreview() {
    previewVideoRef.current?.pause();
    setPreviewingItem(null);
    setPreviewLoadFailed(false);
  }

  function handleHoverStart(item: MaterialHallItem) {
    if (!canHoverPreview() || !item.previewUrl) {
      return;
    }
    setActiveInlineId(item.id);
  }

  function handleHoverEnd(item: MaterialHallItem) {
    if (!canHoverPreview() || activeInlineId !== item.id) {
      return;
    }
    setActiveInlineId(null);
  }

  function handleToggleSound(item: MaterialHallItem) {
    const nextEnabled = !soundEnabled;
    setSoundEnabled(nextEnabled);
    setActiveInlineId(item.id);
    try {
      window.sessionStorage.setItem("material-hall-sound", nextEnabled ? "on" : "off");
    } catch {
      // Ignore session storage failures in private modes.
    }
  }

  function handleCardStageClick(item: MaterialHallItem) {
    if (!canHoverPreview()) {
      return;
    }
    openPreview(item);
  }

  function renderInlinePreview(item: MaterialHallItem) {
    const hasPreview = Boolean(item.previewUrl) && !inlinePreviewFailures[item.id];

    if (!hasPreview) {
      return <MaterialCardArtwork title={item.title} />;
    }

    return (
      <video
        ref={(element) => {
          inlineVideoRefs.current[item.id] = element;
        }}
        data-testid={`material-inline-video-${item.id}`}
        data-active={activeInlineId === item.id ? "true" : "false"}
        src={item.previewUrl ?? undefined}
        className="h-full w-full bg-slate-950 object-contain"
        muted={!soundEnabled}
        loop
        playsInline
        preload="auto"
        onContextMenu={(event) => event.preventDefault()}
        onError={() =>
          setInlinePreviewFailures((current) => ({
            ...current,
            [item.id]: true,
          }))
        }
      />
    );
  }

  return (
    <div className="space-y-3 pb-8 md:space-y-4">
      {!embedded ? (
        <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 sm:rounded-[28px] sm:px-6 sm:py-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#0066DD]">素材大厅</p>
          <h1 className="mt-2 text-[22px] font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-3xl sm:leading-[1.05]">
            列表里先看片，再决定领取
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            卡片直接显示视频预览，桌面端悬停播放，手机端滚动到主视区自动播放。需要更大画面时，再进入完整预览。
          </p>
        </section>
      ) : null}

      {!hideMobileFilters ? (
        <section className="sticky top-2 z-20 space-y-3 rounded-[18px] border border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:top-0 sm:rounded-[24px] sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#0066DD]">筛选素材</p>
              <p className="mt-1 text-sm text-slate-500">保留搜索和标签筛选，把主屏空间留给视频内容。</p>
            </div>
            <div
              data-testid="material-hall-quota-hint"
              className="rounded-full border border-[#BFD6FF] bg-[#F4F8FF] px-3 py-2 text-right text-xs font-semibold text-[#174EA6]"
            >
              <span>剩余 {quota.remainingCount}</span>
              <span className="mx-1 text-slate-300">/</span>
              <span>今日 {quota.limitCount}</span>
            </div>
          </div>

          <form className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2" onSubmit={handleSearchSubmit}>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="搜索素材标题、标签或文件名"
              className="min-w-0 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#0066DD] sm:py-3"
            />
            <button
              type="submit"
              className="rounded-full bg-[#0066DD] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0055BB] sm:py-3"
            >
              搜索
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-full border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:px-4 sm:py-3"
            >
              清空
            </button>
          </form>

          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2 pb-1">
              <button
                type="button"
                onClick={() => handleTagClick("")}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition sm:px-4 sm:py-2 sm:text-sm ${
                  !activeTag
                    ? "border-[#0066DD] bg-[#EAF2FF] text-[#0066DD]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                全部
              </button>
              {visibleTags.map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => handleTagClick(tag.name)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition sm:px-4 sm:py-2 sm:text-sm ${
                    activeTag === tag.name
                      ? "border-[#0066DD] bg-[#EAF2FF] text-[#0066DD]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
          当前筛选条件下没有可领取的视频素材。
        </div>
      ) : (
        <div data-testid="material-grid" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
          {items.map((item) => (
            <article
              key={item.id}
              data-testid={`material-card-${item.id}`}
              ref={(element) => {
                cardRefs.current[item.id] = element;
                if (element) {
                  element.dataset.materialId = item.id;
                }
              }}
              className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              onMouseEnter={() => handleHoverStart(item)}
              onMouseLeave={() => handleHoverEnd(item)}
            >
              <div
                data-testid={`material-preview-stage-${item.id}`}
                className="relative aspect-[9/13] overflow-hidden bg-slate-100 sm:aspect-[16/10] sm:cursor-zoom-in"
                onClick={() => handleCardStageClick(item)}
                role={canHoverPreview() ? "button" : undefined}
                tabIndex={canHoverPreview() ? 0 : undefined}
                onKeyDown={(event) => {
                  if (!canHoverPreview()) {
                    return;
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openPreview(item);
                  }
                }}
              >
                {renderInlinePreview(item)}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/68 via-transparent to-transparent" />
                <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                  <PreviewBadge>{item.materialTypeLabel}</PreviewBadge>
                  <PreviewBadge>{formatDuration(item.durationMs)}</PreviewBadge>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleSound(item);
                    }}
                    className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
                    aria-label={`${soundEnabled ? "关闭声音" : "打开声音"} ${item.title}`}
                  >
                    {soundEnabled ? "关闭声音" : "打开声音"}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openPreview(item);
                    }}
                    className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-white"
                    aria-label={`查看完整预览 ${item.title}`}
                  >
                    完整预览
                  </button>
                </div>
              </div>

              <div className="space-y-3 px-4 pb-4 pt-3">
                <div className="space-y-1">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-950">{item.title}</p>
                  <p className="text-xs text-slate-500">{formatUploadDate(item.createdAt)}</p>
                </div>

                <div className="flex min-h-6 flex-wrap gap-2">
                  {item.tags.length > 0 ? (
                    item.tags.slice(0, 2).map((tag) => (
                      <span key={`${item.id}-${tag}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-400">未设置标签</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={claimingId === item.id || quota.remainingCount <= 0}
                  onClick={() => void handleClaim(item.id)}
                  className="w-full rounded-full bg-[#0066DD] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0055BB] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {claimingId === item.id ? "领取中..." : "领取并下载"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {previewingItem ? (
        <div data-testid="material-preview-overlay" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={closePreview}>
          <div className="md:hidden">
            <div className="flex h-full flex-col">
              <div className="relative flex-1 bg-black">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    closePreview();
                  }}
                  className="absolute right-4 top-4 z-10 rounded-full bg-white/92 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  关闭
                </button>
                {previewLoadFailed || !previewingItem.previewUrl ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
                    <div onClick={(event) => event.stopPropagation()}>
                      预览文件暂时不可用。你可以直接领取素材，或联系管理员补齐预览资源后再查看。
                    </div>
                  </div>
                ) : (
                  <video
                    ref={previewVideoRef}
                    src={previewingItem.previewUrl}
                    poster={previewingItem.posterUrl ?? undefined}
                    className="h-full w-full object-contain"
                    controls
                    autoPlay
                    playsInline
                    controlsList="nodownload noplaybackrate"
                    disablePictureInPicture
                    onContextMenu={(event) => event.preventDefault()}
                    onClick={(event) => event.stopPropagation()}
                    onError={() => setPreviewLoadFailed(true)}
                  />
                )}
              </div>

              <div className="rounded-t-[28px] bg-white px-5 pb-6 pt-5 shadow-[0_-20px_48px_rgba(15,23,42,0.18)]">
                <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200" />
                <div className="space-y-4" onClick={(event) => event.stopPropagation()}>
                  <div>
                    <p className="text-xs font-medium text-[#0066DD]">素材预览</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-950">{previewingItem.title}</h2>
                    <p className="mt-2 text-xs text-slate-500">{formatUploadDate(previewingItem.createdAt)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {previewingItem.tags.length > 0 ? (
                      previewingItem.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-400">未设置标签</span>
                    )}
                  </div>

                  <p className="text-sm leading-6 text-slate-600">
                    {previewingItem.description?.trim() || "暂无描述，确认画面内容后即可领取并下载。"}
                  </p>

                  <button
                    type="button"
                    disabled={claimingId === previewingItem.id || quota.remainingCount <= 0}
                    onClick={() => void handleClaim(previewingItem.id)}
                    className="w-full rounded-full bg-[#0066DD] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0055BB] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {claimingId === previewingItem.id ? "领取中..." : "领取并下载"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden h-full items-center justify-center p-6 md:flex">
            <div className="grid h-full w-full max-w-7xl overflow-hidden rounded-[28px] bg-slate-950 shadow-2xl xl:grid-cols-[minmax(0,1fr)_360px]">
              <div data-testid="material-preview-desktop-media-blank" className="flex min-h-[50vh] items-center justify-center bg-black p-4">
                {previewLoadFailed || !previewingItem.previewUrl ? (
                  <div className="flex h-full min-h-[50vh] w-full items-center justify-center rounded-2xl border border-dashed border-white/15 px-10 text-center text-sm leading-6 text-white/75">
                    <div onClick={(event) => event.stopPropagation()}>
                      预览文件暂时不可用。你可以直接领取素材，或联系管理员补齐预览资源后再查看。
                    </div>
                  </div>
                ) : (
                  <video
                    ref={previewVideoRef}
                    src={previewingItem.previewUrl}
                    poster={previewingItem.posterUrl ?? undefined}
                    className="max-h-full max-w-full rounded-2xl"
                    controls
                    autoPlay
                    playsInline
                    controlsList="nodownload noplaybackrate"
                    disablePictureInPicture
                    onContextMenu={(event) => event.preventDefault()}
                    onClick={(event) => event.stopPropagation()}
                    onError={() => setPreviewLoadFailed(true)}
                  />
                )}
              </div>

              <aside data-testid="material-preview-desktop-info-blank" className="flex flex-col justify-between gap-6 bg-slate-900 p-6 text-white">
                <div className="space-y-4" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-white/60">素材预览</p>
                      <h2 className="mt-1 text-xl font-semibold">{previewingItem.title}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        closePreview();
                      }}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm"
                    >
                      关闭
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">{formatDuration(previewingItem.durationMs)}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">{formatUploadDate(previewingItem.createdAt)}</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-white/60">标签</p>
                    <div className="flex flex-wrap gap-2">
                      {previewingItem.tags.length > 0 ? (
                        previewingItem.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/60">未设置标签</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-white/60">素材说明</p>
                    <p className="text-sm leading-6 text-white/85">
                      {previewingItem.description?.trim() || "暂无描述，确认画面内容后即可领取并下载。"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={claimingId === previewingItem.id || quota.remainingCount <= 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleClaim(previewingItem.id);
                  }}
                  className="w-full rounded-full bg-[#0066DD] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0055BB] disabled:cursor-not-allowed disabled:bg-slate-600"
                >
                  {claimingId === previewingItem.id ? "领取中..." : "领取并下载"}
                </button>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
