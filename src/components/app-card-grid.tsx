"use client";

import Link from "next/link";
import type { AppWithRunCount } from "@/lib/db/apps";

const CATEGORY_COLORS: Record<string, string> = {
  图像: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  视频: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  声音: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  文本: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
};

const FALLBACK_ICON_COLORS = [
  "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-200",
];

// Mock data for engagement stats and author (since not in DB)
const MOCK_STATS: Record<string, { author: string; likes: number; stars: number; views: string; isRecommended?: boolean }> = {
  "img-upscaler": { author: "AI Lab", likes: 328, stars: 892, views: "4.2w", isRecommended: true },
  "img-background": { author: "Design Pro", likes: 256, stars: 567, views: "3.1w", isRecommended: true },
  "video-cut": { author: "Media AI", likes: 128, stars: 324, views: "2.8w", isRecommended: false },
  "audio-transcribe": { author: "Speech Lab", likes: 89, stars: 201, views: "1.5w", isRecommended: false },
  "text-summarize": { author: "NLP Team", likes: 445, stars: 1203, views: "8.6w", isRecommended: true },
};

function getMockStats(code: string, fallbackRunCount: number) {
  return MOCK_STATS[code] ?? {
    author: "Unknown",
    likes: Math.floor(fallbackRunCount * 1.5),
    stars: Math.floor(fallbackRunCount * 3.2),
    views: `${(fallbackRunCount * 0.12).toFixed(1)}w`,
  };
}

function getFallbackIconClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return FALLBACK_ICON_COLORS[Math.abs(hash) % FALLBACK_ICON_COLORS.length];
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "A";
}

interface AppCardGridProps {
  apps: AppWithRunCount[];
}

export function AppCardGrid({ apps }: AppCardGridProps) {
  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <svg className="mb-3 h-12 w-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm">暂无应用</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {apps.map((app) => {
        const categoryColor = app.category ? CATEGORY_COLORS[app.category] : null;
        const stats = getMockStats(app.code, app.runCount);
        const fallbackIconClass = getFallbackIconClass(app.name);
        const coverUrl = app.coverPoster?.trim() || null;

        return (
          <Link
            key={app.code}
            href={`/apps/${encodeURIComponent(app.code)}`}
            className="card group flex flex-col overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            aria-label={`${app.name}应用，${stats.views}次浏览`}
          >
            {/* Cover image */}
            <div className="relative h-28 w-full overflow-hidden bg-[var(--bg-secondary)]">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  width={400}
                  height={200}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 text-4xl font-semibold text-slate-400 dark:from-slate-900 dark:via-slate-950 dark:to-slate-800 dark:text-slate-500">
                  {getInitial(app.name)}
                </div>
              )}
              {/* Recommended badge */}
              {stats.isRecommended && (
                <span className="absolute left-2 top-2 rounded-full bg-[var(--error)] px-2 py-0.5 text-[10px] font-semibold text-white">
                  推荐
                </span>
              )}
              {/* Category badge */}
              {categoryColor && (
                <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor}`}>
                  {app.category}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-4">
              {/* Icon + Name row */}
              <div className="mb-2 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${fallbackIconClass}`}
                >
                  {getInitial(app.name)}
                </div>
                <h3 className="text-sm font-semibold text-[var(--label-primary)] line-clamp-1">{app.name}</h3>
              </div>

              {/* Author */}
              <p className="mb-2 text-xs text-[var(--label-tertiary)]">{stats.author}</p>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Engagement stats */}
              <div className="mt-3 flex items-center gap-4 border-t border-[var(--gray-5)] pt-3 text-xs text-[var(--label-tertiary)]">
                <span className="flex items-center gap-1" aria-label={`${stats.likes}个收藏`}>
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                  {stats.likes}
                </span>
                <span className="flex items-center gap-1" aria-label={`${stats.stars}个评分`}>
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {stats.stars}
                </span>
                <span className="flex items-center gap-1" aria-label={`${stats.views}次浏览`}>
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10s3-5 7.5-5 7.5 5 7.5 5-3 5-7.5 5S2 10 2 10z" />
                    <circle cx="10" cy="10" r="3" />
                  </svg>
                  {stats.views}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
