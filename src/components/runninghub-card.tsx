"use client";

import Link from "next/link";
import { useState } from "react";

import type { AppWithRunCount } from "@/lib/db/apps";

interface Props {
  app: AppWithRunCount;
}

const DEFAULT_COVER = "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800&auto=format&fit=crop";

function resolveCoverUrl(coverPoster: string | null | undefined) {
  const value = coverPoster?.trim();
  if (!value) {
    return DEFAULT_COVER;
  }

  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
  }

  return DEFAULT_COVER;
}

function CoverImage({ alt, src }: { alt: string; src: string }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const finalSrc = loadFailed ? DEFAULT_COVER : src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalSrc}
      alt={alt}
      className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
      decoding="async"
      onError={(event) => {
        if (finalSrc === DEFAULT_COVER) {
          event.currentTarget.onerror = null;
          return;
        }

        setLoadFailed(true);
      }}
    />
  );
}

export function RunningHubLightCard({ app }: Props) {
  const coverUrl = resolveCoverUrl(app.coverPoster);

  return (
    <Link href={`/apps/${encodeURIComponent(app.code)}`} className="group block">
      <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="relative aspect-[4/3] w-full bg-slate-100">
          <CoverImage key={coverUrl} src={coverUrl} alt={app.name} />
        </div>

        <div className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold text-slate-900 transition-colors group-hover:text-blue-600">
              {app.name}
            </h3>
            <p className="mt-1 text-xs text-slate-500">运行次数</p>
          </div>
          <div className="rounded-full bg-slate-900 px-3 py-2 text-center text-white">
            <span className="block text-sm font-bold leading-none tabular-nums">{app.runCount}</span>
            <span className="mt-1 block text-[10px] text-white/70">次</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
