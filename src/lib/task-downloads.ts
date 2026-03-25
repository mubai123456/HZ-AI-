import path from "node:path";
import { Readable } from "node:stream";

import { createMediaStreamResponse, resolveMaterialObjectPath } from "@/lib/material-storage";

export type TaskOutputDownloadAssetSource = {
  id: string;
  name: string;
  mimeType: string | null;
  url: string | null;
  storageKey: string | null;
};

function sanitizeSegment(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_").trim();
}

function guessExtension(input: { filename?: string | null; mimeType?: string | null; url?: string | null }) {
  const fromFilename = input.filename ? path.extname(input.filename) : "";
  if (fromFilename) {
    return fromFilename.toLowerCase();
  }

  const source = input.url ?? "";
  try {
    if (/^https?:\/\//i.test(source)) {
      const parsed = new URL(source);
      const ext = path.extname(parsed.pathname);
      if (ext) {
        return ext.toLowerCase();
      }
    }
  } catch {
    // Fall through to mime-based inference.
  }

  const ext = path.extname(source);
  if (ext) {
    return ext.toLowerCase();
  }

  switch (input.mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "video/mp4":
      return ".mp4";
    default:
      return "";
  }
}

export function buildArchiveEntryFilename(
  asset: TaskOutputDownloadAssetSource,
  usedNames: Set<string>,
) {
  const rawBase = sanitizeSegment(path.basename(asset.name, path.extname(asset.name)) || "output");
  const base = rawBase || "output";
  const ext = guessExtension({
    filename: asset.name,
    mimeType: asset.mimeType,
    url: asset.storageKey ?? asset.url,
  });

  let candidate = `${base}${ext}`;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${base}-${suffix}${ext}`;
    suffix += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

export function buildArchiveDownloadName(siteTaskNo: string) {
  return `${sanitizeSegment(siteTaskNo || "task")}-outputs.zip`;
}

export function resolveTaskAssetFilePath(asset: TaskOutputDownloadAssetSource) {
  const objectKey = asset.storageKey ?? asset.url ?? "";
  if (!objectKey) {
    return null;
  }

  return resolveMaterialObjectPath("local-private", objectKey);
}

export async function createTaskAssetDownloadResponse(input: {
  asset: TaskOutputDownloadAssetSource;
  downloadName: string;
  request: Request;
}) {
  const filePath = resolveTaskAssetFilePath(input.asset);
  if (filePath) {
    return createMediaStreamResponse({
      filePath,
      request: input.request,
      contentType: input.asset.mimeType,
      disposition: "attachment",
      downloadName: input.downloadName,
    });
  }

  const sourceUrl = input.asset.url;
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
    return null;
  }

  const upstream = await fetch(sourceUrl);
  if (!upstream.ok || !upstream.body) {
    throw new Error(`Remote asset request failed: ${upstream.status}`);
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? input.asset.mimeType ?? "application/octet-stream",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(input.downloadName)}"`,
    "Cache-Control": "private, no-store, max-age=0",
  });

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}

export async function readTaskAssetBuffer(asset: TaskOutputDownloadAssetSource) {
  const filePath = resolveTaskAssetFilePath(asset);
  if (filePath) {
    const { readFile } = await import("node:fs/promises");
    return readFile(filePath);
  }

  const sourceUrl = asset.url;
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
    throw new Error("Asset source is unavailable");
  }

  const upstream = await fetch(sourceUrl);
  if (!upstream.ok) {
    throw new Error(`Remote asset request failed: ${upstream.status}`);
  }

  return Buffer.from(await upstream.arrayBuffer());
}

export function toWebReadable(stream: NodeJS.ReadableStream) {
  return Readable.toWeb(stream as unknown as Readable) as ReadableStream;
}
