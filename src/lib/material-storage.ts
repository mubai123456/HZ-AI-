import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { getMaterialsObjectKey, uploadBufferToObjectStorage } from "@/lib/object-storage";

const PRIVATE_STORAGE_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), "storage");
const PUBLIC_STORAGE_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), "public");

function sanitizeFilename(filename: string) {
  return filename.replace(/[^\w.\-\u4e00-\u9fa5]/g, "_");
}

function inferContentType(filename: string, fallback?: string | null) {
  if (fallback) {
    return fallback;
  }

  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    case ".m4v":
      return "video/x-m4v";
    case ".webm":
      return "video/webm";
    case ".avi":
      return "video/x-msvideo";
    case ".mkv":
      return "video/x-matroska";
    case ".m3u8":
      return "application/x-mpegURL";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

export async function analyzeUploadedMaterialFile(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return analyzeMaterialBuffer({
    bytes,
    fileName: file.name || "video.mp4",
    mimeType: file.type,
  });
}

export function analyzeMaterialBuffer(input: {
  bytes: Buffer;
  fileName: string;
  mimeType?: string | null;
}) {
  const checksumSha256 = createHash("sha256").update(input.bytes).digest("hex");
  const safeFilename = sanitizeFilename(input.fileName || "video.mp4");

  return {
    bytes: input.bytes,
    checksumSha256,
    fileSizeBytes: input.bytes.byteLength,
    mimeType: inferContentType(input.fileName, input.mimeType),
    safeFilename,
  };
}

export async function storeMaterialFile(input: {
  bytes: Buffer;
  safeFilename: string;
}) {
  const stored = await uploadBufferToObjectStorage({
    objectKey: getMaterialsObjectKey(input.safeFilename),
    body: input.bytes,
    visibility: "private",
  });

  return {
    bucket: stored.bucket,
    objectKey: stored.objectKey,
  };
}

export function resolveMaterialObjectPath(bucket: string, objectKey: string) {
  if (/^https?:\/\//i.test(objectKey)) {
    return null;
  }

  const normalized = objectKey.replace(/^\/+/, "");
  const privatePath = path.join(PRIVATE_STORAGE_ROOT, ...normalized.split("/"));
  if (bucket === "local-private" && existsSync(privatePath)) {
    return privatePath;
  }

  if (existsSync(privatePath)) {
    return privatePath;
  }

  const publicPath = path.join(PUBLIC_STORAGE_ROOT, ...normalized.split("/"));
  if (existsSync(publicPath)) {
    return publicPath;
  }

  return null;
}

export async function createMediaStreamResponse(input: {
  filePath: string;
  request: Request;
  contentType?: string | null;
  disposition?: "inline" | "attachment";
  downloadName?: string | null;
}) {
  const fileStat = await stat(input.filePath);
  const rangeHeader = input.request.headers.get("range");
  const mimeType = inferContentType(input.filePath, input.contentType ?? undefined);
  const disposition = input.disposition ?? "inline";

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Type": mimeType,
    "Content-Disposition": `${disposition}; filename="${encodeURIComponent(input.downloadName ?? path.basename(input.filePath))}"`,
    "Cache-Control": "private, no-store, max-age=0",
  });

  if (!rangeHeader) {
    headers.set("Content-Length", String(fileStat.size));
    const stream = createReadStream(input.filePath);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers,
    });
  }

  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!match) {
    headers.set("Content-Length", String(fileStat.size));
    const stream = createReadStream(input.filePath);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers,
    });
  }

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : fileStat.size - 1;
  const chunkStart = Number.isFinite(start) ? start : 0;
  const chunkEnd = Number.isFinite(end) ? Math.min(end, fileStat.size - 1) : fileStat.size - 1;
  const chunkSize = chunkEnd - chunkStart + 1;

  headers.set("Content-Length", String(chunkSize));
  headers.set("Content-Range", `bytes ${chunkStart}-${chunkEnd}/${fileStat.size}`);

  const stream = createReadStream(input.filePath, {
    start: chunkStart,
    end: chunkEnd,
  });

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 206,
    headers,
  });
}
