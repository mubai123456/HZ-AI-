"use client";

import { useMemo, useState } from "react";

import { ImageLightbox } from "@/components/image-lightbox";

const DEFAULT_SHOWCASE_IMAGE =
  "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800&auto=format&fit=crop";

function resolveShowcaseImages(showcaseImages: string[], coverPoster?: string | null) {
  const images = showcaseImages.map((item) => item.trim()).filter(Boolean);
  if (images.length > 0) {
    return images;
  }

  if (coverPoster?.trim()) {
    return [coverPoster.trim()];
  }

  return [DEFAULT_SHOWCASE_IMAGE];
}

export function AppShowcaseGallery({
  appName,
  showcaseImages,
  coverPoster,
  variant = "standalone",
}: {
  appName: string;
  showcaseImages: string[];
  coverPoster?: string | null;
  variant?: "standalone" | "embedded";
}) {
  const images = useMemo(
    () => resolveShowcaseImages(showcaseImages, coverPoster),
    [coverPoster, showcaseImages],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const activeImage = images[Math.min(activeIndex, images.length - 1)] ?? DEFAULT_SHOWCASE_IMAGE;
  const isEmbedded = variant === "embedded";

  return (
    <section
      data-testid={isEmbedded ? "app-showcase-gallery-embedded" : "app-showcase-gallery-standalone"}
      className={`rounded-[28px] border border-slate-200 bg-white shadow-sm ${
        isEmbedded ? "p-4" : "p-5"
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#0066DD]">{isEmbedded ? "案例展示" : "效果展示"}</p>
          <h2 className={`mt-1 font-semibold text-slate-950 ${isEmbedded ? "text-lg" : "text-xl"}`}>
            {appName} {isEmbedded ? "案例参考" : "示例效果"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isEmbedded ? "先看案例，再查看下方结果工作区。" : "先看案例图，再决定是否提交任务。"}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          {images.length} 张参考图
        </span>
      </div>

      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className={`mt-4 flex w-full items-center justify-center overflow-hidden rounded-[24px] bg-slate-50 ${
          isEmbedded ? "aspect-[16/5] p-3" : "aspect-[16/7] p-4"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-testid="app-showcase-main-image"
          src={activeImage}
          alt={`${appName} 效果展示`}
          className="h-full w-full object-contain"
        />
      </button>

      {images.length > 1 ? (
        <div className={`mt-4 flex gap-3 overflow-x-auto pb-1 ${isEmbedded ? "pt-1" : ""}`}>
          {images.map((imageUrl, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                data-testid={`app-showcase-thumb-${index}`}
                onClick={() => setActiveIndex(index)}
                className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[18px] border p-2 transition ${
                  isEmbedded ? "h-16 w-24" : "h-20 w-28"
                } ${
                  active
                    ? "border-[#0066DD] bg-sky-50 shadow-sm"
                    : "border-slate-200 bg-white"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-full w-full object-contain" />
              </button>
            );
          })}
        </div>
      ) : null}

      {lightboxOpen ? (
        <ImageLightbox
          assets={images.map((imageUrl, index) => ({
            id: `showcase-${index}`,
            name: `${appName}-${index + 1}`,
            url: imageUrl,
          }))}
          initialIndex={activeIndex}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </section>
  );
}
