import type { ImageMirrorMode } from "@/lib/types";

function parseFilenameFromDisposition(disposition: string | null, fallback: string) {
  if (!disposition) {
    return fallback;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = /filename="?([^"]+)"?/i.exec(disposition);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return fallback;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
}

function splitFilename(filename: string) {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex <= 0) {
    return { base: filename, extension: "" };
  }

  return {
    base: filename.slice(0, dotIndex),
    extension: filename.slice(dotIndex),
  };
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(blob);
  });
}

async function loadImageFromBlob(blob: Blob) {
  const img = new Image();
  img.decoding = "async";

  const imageUrl = await blobToDataUrl(blob);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = imageUrl;
  });
}

async function mirrorImageBlob(blob: Blob, mirrorMode: Exclude<ImageMirrorMode, "none">) {
  const img = await loadImageFromBlob(blob);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  if (mirrorMode === "horizontal") {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  } else {
    context.translate(0, canvas.height);
    context.scale(1, -1);
  }

  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
        return;
      }

      reject(new Error("Failed to export mirrored image"));
    }, blob.type || "image/png");
  });
}

export async function downloadAssetFromEndpoint(url: string, fallbackFilename: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("download_failed");
  }

  const blob = await response.blob();
  const filename = parseFilenameFromDisposition(
    response.headers.get("content-disposition"),
    fallbackFilename,
  );

  triggerBrowserDownload(blob, filename);
}

export async function downloadMirroredAssetFromEndpoint(params: {
  url: string;
  fallbackFilename: string;
  mirrorMode: Exclude<ImageMirrorMode, "none">;
}) {
  const response = await fetch(params.url);
  if (!response.ok) {
    throw new Error("download_failed");
  }

  const blob = await response.blob();
  const filename = parseFilenameFromDisposition(
    response.headers.get("content-disposition"),
    params.fallbackFilename,
  );
  const mirroredBlob = await mirrorImageBlob(blob, params.mirrorMode);
  const { base, extension } = splitFilename(filename);
  const suffix = params.mirrorMode === "horizontal" ? "-horizontal-mirror" : "-vertical-mirror";

  triggerBrowserDownload(mirroredBlob, `${base}${suffix}${extension}`);
}
