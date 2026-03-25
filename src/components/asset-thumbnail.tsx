"use client";

import { useState } from "react";

interface AssetThumbnailProps {
  asset: {
    id: string;
    name: string;
    url: string | null;
  };
}

function isDisplayableAssetUrl(url: string): boolean {
  if (url.startsWith("/")) {
    return true;
  }

  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function AssetThumbnail({ asset }: AssetThumbnailProps) {
  const [imgError, setImgError] = useState(false);

  if (asset.url && !imgError && isDisplayableAssetUrl(asset.url)) {
    return (
      <div className="relative overflow-hidden rounded-[20px] border border-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.url}
          alt={asset.name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          {asset.name}
        </div>
      </div>
    );
  }

  // Fallback placeholder with image icon
  return (
    <div className="flex aspect-square items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}
