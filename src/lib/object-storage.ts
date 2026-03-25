import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/lib/env";

const REMOTE_OBJECT_STORAGE_KEYS = [
  "S3_BUCKET",
  "S3_REGION",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_BASE_URL",
] as const;

function sanitizeFilename(fileName: string) {
  const baseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return baseName.replace(/-+/g, "-").replace(/^-|-$/g, "") || "upload.bin";
}

function normalizePrefix(prefix: string) {
  return prefix.replace(/^\/+|\/+$/g, "");
}

function buildObjectKey(prefix: string, fileName: string) {
  const sanitized = sanitizeFilename(fileName);
  const extension = path.extname(sanitized);
  const stem = extension ? sanitized.slice(0, -extension.length) : sanitized;
  const datedPrefix = [normalizePrefix(prefix), new Date().toISOString().slice(0, 10)]
    .filter(Boolean)
    .join("/");

  return [datedPrefix, `${stem}-${randomUUID()}${extension}`].filter(Boolean).join("/");
}

function buildS3Client() {
  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: false,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

function getPublicObjectUrl(objectKey: string) {
  const baseUrl = env.S3_PUBLIC_BASE_URL.replace(/\/+$/, "");
  return `${baseUrl}/${resolveStoredObjectKey(objectKey)}`;
}

function hasRemoteObjectStorageConfig() {
  return REMOTE_OBJECT_STORAGE_KEYS.every((key) => Boolean(process.env[key]?.trim()));
}

function resolveLocalPublicAssetTarget(objectKey: string) {
  const normalized = resolveStoredObjectKey(objectKey);
  const resultsPrefix = `${normalizePrefix(env.S3_RESULTS_PREFIX)}/`;
  const referencesPrefix = `${normalizePrefix(env.S3_REFERENCES_PREFIX)}/`;

  if (normalized.startsWith(resultsPrefix)) {
    const relativePath = normalized.slice(resultsPrefix.length);
    const urlPath = `/${path.posix.join("assets", relativePath)}`;
    return {
      filePath: path.join(process.cwd(), "public", ...urlPath.replace(/^\/+/, "").split("/")),
      urlPath,
    };
  }

  if (normalized.startsWith(referencesPrefix)) {
    const relativePath = normalized.slice(referencesPrefix.length);
    const urlPath = `/${path.posix.join("assets", "references", relativePath)}`;
    return {
      filePath: path.join(process.cwd(), "public", ...urlPath.replace(/^\/+/, "").split("/")),
      urlPath,
    };
  }

  return null;
}

function resolveLocalPrivateTarget(objectKey: string) {
  const normalized = resolveStoredObjectKey(objectKey);
  return path.join(process.cwd(), "storage", ...normalized.split("/"));
}

async function toBuffer(body: Buffer | Uint8Array | Blob | string) {
  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (typeof body === "string") {
    return Buffer.from(body);
  }

  return Buffer.from(await body.arrayBuffer());
}

async function writeLocalObject(input: {
  objectKey: string;
  body: Buffer | Uint8Array | Blob | string;
  visibility: "public" | "private";
}) {
  const buffer = await toBuffer(input.body);

  if (input.visibility === "public") {
    const target = resolveLocalPublicAssetTarget(input.objectKey);
    if (target) {
      await mkdir(path.dirname(target.filePath), { recursive: true });
      await writeFile(target.filePath, buffer);
      return {
        bucket: "local-public",
        objectKey: target.urlPath,
        fileUrl: target.urlPath,
      };
    }
  }

  const filePath = resolveLocalPrivateTarget(input.objectKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);

  return {
    bucket: "local-private",
    objectKey: resolveStoredObjectKey(input.objectKey),
    fileUrl: resolveStoredObjectKey(input.objectKey),
  };
}

export type SignedUploadTarget = {
  bucket: string;
  objectKey: string;
  uploadUrl: string;
  fileUrl: string;
  headers: Record<string, string>;
};

export function isRemoteObjectStorageEnabled() {
  return hasRemoteObjectStorageConfig();
}

export async function createSignedUploadTarget(input: {
  prefix: string;
  fileName: string;
  contentType: string;
  size?: number;
  expiresInSeconds?: number;
}) {
  if (!hasRemoteObjectStorageConfig()) {
    throw new Error("Signed uploads require remote object storage configuration.");
  }

  const objectKey = buildObjectKey(input.prefix, input.fileName);
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: objectKey,
    ContentType: input.contentType,
  });

  const uploadUrl = await getSignedUrl(buildS3Client(), command, {
    expiresIn: input.expiresInSeconds ?? env.UPLOAD_SIGN_TTL_SECONDS,
    signableHeaders: new Set(["Content-Type"]),
  });

  return {
    bucket: env.S3_BUCKET,
    objectKey,
    uploadUrl,
    fileUrl: getPublicObjectUrl(objectKey),
    headers: {
      "Content-Type": input.contentType,
    },
  } satisfies SignedUploadTarget;
}

export async function createSignedDownloadUrl(input: {
  objectKey: string;
  fileName?: string | null;
  disposition?: "inline" | "attachment";
  expiresInSeconds?: number;
}) {
  if (!hasRemoteObjectStorageConfig()) {
    throw new Error("Signed downloads require remote object storage configuration.");
  }

  const disposition = input.disposition ?? "inline";
  const fileName = input.fileName ? sanitizeFilename(input.fileName) : path.basename(input.objectKey);
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: resolveStoredObjectKey(input.objectKey),
    ResponseContentDisposition: `${disposition}; filename="${encodeURIComponent(fileName)}"`,
  });

  return getSignedUrl(buildS3Client(), command, {
    expiresIn: input.expiresInSeconds ?? env.UPLOAD_SIGN_TTL_SECONDS,
  });
}

export async function uploadBufferToObjectStorage(input: {
  objectKey: string;
  body: Buffer | Uint8Array | Blob | string;
  contentType?: string | null;
  cacheControl?: string;
  visibility?: "public" | "private";
}) {
  if (!hasRemoteObjectStorageConfig()) {
    return writeLocalObject({
      objectKey: input.objectKey,
      body: input.body,
      visibility: input.visibility ?? "public",
    });
  }

  const objectKey = resolveStoredObjectKey(input.objectKey);
  const upload = new Upload({
    client: buildS3Client(),
    params: {
      Bucket: env.S3_BUCKET,
      Key: objectKey,
      Body: input.body,
      ContentType: input.contentType ?? undefined,
      CacheControl: input.cacheControl,
    },
  });

  await upload.done();

  return {
    bucket: env.S3_BUCKET,
    objectKey,
    fileUrl: getPublicObjectUrl(objectKey),
  };
}

export async function readStoredObjectBuffer(objectKey: string) {
  const normalized = resolveStoredObjectKey(objectKey);

  if (!hasRemoteObjectStorageConfig()) {
    const publicTarget = resolveLocalPublicAssetTarget(normalized);
    const candidatePaths = [
      publicTarget?.filePath,
      resolveLocalPrivateTarget(normalized),
    ].filter((value): value is string => Boolean(value));

    for (const filePath of candidatePaths) {
      if (!existsSync(filePath)) {
        continue;
      }

      const body = await readFile(filePath);
      return {
        body,
        contentType: null,
        contentLength: body.byteLength,
      };
    }

    throw new Error(`Stored object does not exist locally: ${normalized}`);
  }

  const response = await buildS3Client().send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: normalized,
    }),
  );
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error(`Stored object is empty: ${normalized}`);
  }

  return {
    body: Buffer.from(bytes),
    contentType: response.ContentType ?? null,
    contentLength: response.ContentLength ?? bytes.length,
  };
}

export async function deleteStoredObject(objectKey: string) {
  const normalized = resolveStoredObjectKey(objectKey);

  if (!hasRemoteObjectStorageConfig()) {
    const publicTarget = resolveLocalPublicAssetTarget(normalized);
    const candidatePaths = [
      publicTarget?.filePath,
      resolveLocalPrivateTarget(normalized),
    ].filter((value): value is string => Boolean(value));

    await Promise.all(candidatePaths.map((filePath) => rm(filePath, { force: true })));
    return;
  }

  await buildS3Client().send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: normalized,
    }),
  );
}

export function resolveStoredObjectKey(objectKey: string) {
  return objectKey.replace(/^\/+/, "");
}

export function getResultsObjectKey(taskId: string, fileName: string) {
  return [normalizePrefix(env.S3_RESULTS_PREFIX), taskId, sanitizeFilename(fileName)].join("/");
}

export function getMaterialsObjectKey(fileName: string) {
  return buildObjectKey(env.S3_MATERIALS_PREFIX, fileName);
}

export function getReferencesObjectPrefix() {
  return normalizePrefix(env.S3_REFERENCES_PREFIX);
}
