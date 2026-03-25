"use client";

import { useState } from "react";

import { ImageLightbox } from "@/components/image-lightbox";

interface Asset {
  id: string;
  name: string;
  taskNo: string;
  url: string;
  createdByName: string;
}

interface Props {
  assets: Asset[];
}

export function AssetsGalleryClient({ assets }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset, i) => (
          <div key={asset.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
            <button
              onClick={() => setLightboxIndex(i)}
              className="relative block w-full overflow-hidden rounded-[20px]"
            >
              <img
                src={asset.url}
                alt={asset.name}
                className="h-32 w-full cursor-zoom-in object-contain bg-slate-50"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition hover:opacity-100">
                <div className="rounded-full bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-sm">
                  点击查看大图
                </div>
              </div>
            </button>
            <p className="mt-3 text-sm font-semibold text-slate-950">{asset.name}</p>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
              <span>来源任务：{asset.taskNo}</span>
              <span className="font-medium text-slate-500">{asset.createdByName}</span>
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && assets.length > 0 && (
        <ImageLightbox
          assets={assets}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
