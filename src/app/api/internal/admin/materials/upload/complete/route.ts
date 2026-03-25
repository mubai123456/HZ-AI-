import { NextResponse } from "next/server";

import { createMaterialEntry, findMaterialByChecksum } from "@/lib/db/materials";
import { analyzeUploadedMaterialFile, storeMaterialFile } from "@/lib/material-storage";
import { getCurrentSession } from "@/lib/session";
import type { AdminMaterialItem } from "@/lib/types";

export const runtime = "nodejs";

type MaterialMetadataItem = {
  name: string;
  title?: string;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  extension?: string;
  previewSupported?: boolean;
};

type UploadResult =
  | {
      fileName: string;
      status: "created";
      message: string;
      item: AdminMaterialItem;
    }
  | {
      fileName: string;
      status: "skipped_duplicate" | "failed";
      message: string;
    };

function splitTagText(value: string) {
  return value
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSelectedTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    return splitTagText(value);
  }

  return splitTagText(value);
}

function parseMetadata(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as MaterialMetadataItem[];
    }
  } catch {
    return [];
  }

  return [];
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value === "object" &&
      "size" in value &&
      "name" in value &&
      "arrayBuffer" in value &&
      typeof value.arrayBuffer === "function" &&
      Number(value.size) > 0,
  );
}

function getFilesFromFormData(formData: FormData) {
  const multiFiles = formData.getAll("files").filter((item): item is File => isFileLike(item));
  if (multiFiles.length > 0) {
    return multiFiles;
  }

  const singleFile = formData.get("file");
  if (isFileLike(singleFile)) {
    return [singleFile];
  }

  return [];
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问。" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传请求格式不正确。" },
      { status: 400 },
    );
  }

  const files = getFilesFromFormData(formData);
  if (files.length === 0) {
    return NextResponse.json({ error: "请先选择要上传的视频文件。" }, { status: 400 });
  }

  const batchNo = String(formData.get("batchNo") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const selectedTags = parseSelectedTags(formData.get("selectedTags"));
  const newTags = parseSelectedTags(formData.get("newTags"));
  const tags = Array.from(new Set([...selectedTags, ...newTags]));

  const metadataMap = new Map<string, MaterialMetadataItem>();
  for (const item of parseMetadata(formData.get("metadata"))) {
    if (item?.name) {
      metadataMap.set(item.name, item);
    }
  }

  const results: UploadResult[] = [];

  for (const file of files) {
    try {
      const analyzed = await analyzeUploadedMaterialFile(file);
      const existing = await findMaterialByChecksum(analyzed.checksumSha256);

      if (existing) {
        results.push({
          fileName: file.name,
          status: "skipped_duplicate",
          message: `素材已存在，已跳过：${existing.title}`,
        });
        continue;
      }

      const stored = await storeMaterialFile({
        bytes: analyzed.bytes,
        safeFilename: analyzed.safeFilename,
      });

      const metadata = metadataMap.get(file.name);
      const createdItem = await createMaterialEntry({
        title: metadata?.title?.trim() || file.name.replace(/\.[^.]+$/, "").slice(0, 120),
        description,
        materialType: "VIDEO",
        sourceFilename: file.name,
        checksumSha256: analyzed.checksumSha256,
        bucket: stored.bucket,
        objectKey: stored.objectKey,
        fileSizeBytes: analyzed.fileSizeBytes,
        mimeType: analyzed.mimeType,
        width: metadata?.width ?? null,
        height: metadata?.height ?? null,
        durationMs: metadata?.durationMs ?? null,
        batchNo,
        previewReady: metadata?.previewSupported ?? true,
        createdById: session.sub,
        tags,
        variants: [
          {
            kind: "ORIGINAL",
            bucket: stored.bucket,
            objectKey: stored.objectKey,
            mimeType: analyzed.mimeType,
            fileSizeBytes: analyzed.fileSizeBytes,
            width: metadata?.width ?? null,
            height: metadata?.height ?? null,
            durationMs: metadata?.durationMs ?? null,
          },
        ],
      });

      results.push({
        fileName: file.name,
        status: "created",
        message: "上传成功",
        item: {
          ...createdItem,
          exclusiveOwnerName: null,
          claimCount: 0,
          activeClaimId: null,
          uploaderName: session.displayName,
        },
      });
    } catch (error) {
      results.push({
        fileName: file.name,
        status: "failed",
        message: error instanceof Error ? error.message : "上传失败",
      });
    }
  }

  return NextResponse.json({ results }, { status: 201 });
}
