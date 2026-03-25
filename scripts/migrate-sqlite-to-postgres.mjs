import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Pool } from "pg";

const projectRoot = process.cwd();

const jsonColumnsByTable = {
  App: [
    "formSchemaJson",
    "requestMappingJson",
    "defaultParamsJson",
    "syncMappingJson",
    "runninghubAllowedChannelCodesJson",
    "showcaseImagesJson",
  ],
  Task: ["paramsJson", "resultJson", "usageJson"],
  SyncLog: ["payloadJson"],
  FeishuSettings: ["columnMappings"],
  IntegrationSettings: ["runninghubChannelsJson"],
  AuditLog: ["payloadJson"],
};

const booleanColumnsByTable = {
  User: ["active"],
  App: ["enabled", "shareResults"],
  PromptTemplateCategory: ["enabled"],
  PromptTemplate: ["enabled"],
  AppCategory: ["enabled"],
  AppBanner: ["enabled"],
  Material: ["previewReady"],
};

const numericColumnsByTable = {
  TaskAsset: ["width", "height"],
  App: ["estimatedPriceFen", "sortOrder", "viewCount"],
  Task: ["queuePosition", "retryCount", "maxRetries", "estimatedPriceFenSnapshot"],
};

const tableOrder = [
  "User",
  "App",
  "AppTag",
  "AppTagLink",
  "Task",
  "TaskAsset",
  "SyncLog",
  "PromptTag",
  "PromptTemplateCategory",
  "PromptTemplate",
  "PromptTemplateAppScope",
  "PromptTemplateFavorite",
  "PromptTemplateRecentUse",
  "FeishuSettings",
  "SiteSettings",
  "IntegrationSettings",
  "AppCategory",
  "AppBanner",
  "Material",
  "MaterialVariant",
  "MaterialTag",
  "MaterialTagLink",
  "MaterialClaim",
  "MaterialPublishLink",
  "UserDailyQuota",
  "AuditLog",
];

function getTaskOutputStorageMode() {
  return String(process.env.TASK_OUTPUT_STORAGE_MODE ?? "provider_url").trim().toLowerCase() ===
    "object_storage"
    ? "object_storage"
    : "provider_url";
}

function requireEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function sanitizeFileName(fileName) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]+/g, "-") || "file.bin";
}

function normalizePrefix(value) {
  return value.replace(/^\/+|\/+$/g, "");
}

function buildPublicUrl(baseUrl, objectKey) {
  return `${baseUrl.replace(/\/+$/, "")}/${objectKey.replace(/^\/+/, "")}`;
}

function parseJsonValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeRow(tableName, row) {
  const next = { ...row };

  for (const column of jsonColumnsByTable[tableName] ?? []) {
    next[column] = parseJsonValue(next[column]);
  }

  for (const column of booleanColumnsByTable[tableName] ?? []) {
    if (next[column] !== null && next[column] !== undefined) {
      next[column] = Boolean(next[column]);
    }
  }

  for (const column of numericColumnsByTable[tableName] ?? []) {
    if (next[column] !== null && next[column] !== undefined) {
      next[column] = Number(next[column]);
    }
  }

  return next;
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, "\"\"")}"`;
}

async function insertRows(pool, tableName, rows) {
  let insertedCount = 0;

  for (const row of rows) {
    const columns = Object.keys(row);
    if (columns.length === 0) {
      continue;
    }

    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const sql = `INSERT INTO ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    const result = await pool.query(sql, columns.map((column) => row[column]));
    insertedCount += result.rowCount ?? 0;
  }

  return insertedCount;
}

function createS3Client() {
  return new S3Client({
    region: requireEnv("S3_REGION"),
    endpoint: requireEnv("S3_ENDPOINT"),
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
}

async function uploadFileToObjectStorage(client, input) {
  const body = await readFile(input.sourcePath);
  await client.send(
    new PutObjectCommand({
      Bucket: requireEnv("S3_BUCKET"),
      Key: input.objectKey,
      Body: body,
      ContentType: input.contentType || undefined,
      CacheControl: input.cacheControl || undefined,
    }),
  );

  return {
    bucket: requireEnv("S3_BUCKET"),
    objectKey: input.objectKey,
    url: buildPublicUrl(requireEnv("S3_PUBLIC_BASE_URL"), input.objectKey),
    checksumSha256: createHash("sha256").update(body).digest("hex"),
    size: body.byteLength,
  };
}

async function findExistingPath(candidate) {
  if (!candidate || /^https?:\/\//i.test(candidate)) {
    return null;
  }

  const normalized = candidate.replace(/^\/+/, "");
  const candidates = [
    path.join(projectRoot, normalized),
    path.join(projectRoot, "public", normalized),
    path.join(projectRoot, "storage", normalized),
  ];

  for (const filePath of candidates) {
    try {
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        return filePath;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

async function migrateMaterialFiles(sqliteRows, s3Client, report) {
  const materialRows = sqliteRows.Material.map((row) => normalizeRow("Material", row));
  const variantRows = sqliteRows.MaterialVariant.map((row) => normalizeRow("MaterialVariant", row));
  const uploadedBySource = new Map();

  for (const material of materialRows) {
    const sourcePath = await findExistingPath(material.objectKey);
    if (!sourcePath) {
      report.missingFiles.push({ kind: "material", id: material.id, source: material.objectKey });
      continue;
    }

    const objectKey = [
      normalizePrefix(requireEnv("S3_MATERIALS_PREFIX")),
      "migrated",
      material.id,
      "original",
      sanitizeFileName(material.sourceFilename || path.basename(sourcePath)),
    ].join("/");
    const uploaded = await uploadFileToObjectStorage(s3Client, {
      sourcePath,
      objectKey,
      contentType: material.mimeType,
    });
    uploadedBySource.set(material.objectKey, uploaded);
    material.bucket = uploaded.bucket;
    material.objectKey = uploaded.objectKey;
    report.uploadedFiles.push({
      kind: "material",
      sourcePath,
      objectKey: uploaded.objectKey,
    });
  }

  for (const variant of variantRows) {
    const existing = uploadedBySource.get(variant.objectKey);
    if (existing) {
      variant.bucket = existing.bucket;
      variant.objectKey = existing.objectKey;
      continue;
    }

    const sourcePath = await findExistingPath(variant.objectKey);
    if (!sourcePath) {
      report.missingFiles.push({ kind: "material-variant", id: variant.id, source: variant.objectKey });
      continue;
    }

    const objectKey = [
      normalizePrefix(requireEnv("S3_MATERIALS_PREFIX")),
      "migrated",
      variant.materialId,
      variant.kind.toLowerCase(),
      sanitizeFileName(path.basename(sourcePath)),
    ].join("/");
    const uploaded = await uploadFileToObjectStorage(s3Client, {
      sourcePath,
      objectKey,
      contentType: variant.mimeType,
    });
    uploadedBySource.set(variant.objectKey, uploaded);
    variant.bucket = uploaded.bucket;
    variant.objectKey = uploaded.objectKey;
    report.uploadedFiles.push({
      kind: "material-variant",
      sourcePath,
      objectKey: uploaded.objectKey,
    });
  }

  sqliteRows.Material = materialRows;
  sqliteRows.MaterialVariant = variantRows;
}

async function migrateTaskAssetFiles(sqliteRows, s3Client, report) {
  const taskAssetRows = sqliteRows.TaskAsset.map((row) => normalizeRow("TaskAsset", row));
  const outputStorageMode = getTaskOutputStorageMode();

  for (const asset of taskAssetRows) {
    if (asset.kind === "OUTPUT" && outputStorageMode !== "object_storage") {
      report.skippedFiles.push({
        kind: "task-output",
        id: asset.id,
        reason: "TASK_OUTPUT_STORAGE_MODE=provider_url",
        source: asset.url ?? asset.storageKey ?? null,
      });
      asset.storageKey = null;
      continue;
    }

    const localCandidate =
      asset.storageKey ||
      (typeof asset.url === "string" && asset.url.startsWith("/") ? asset.url : null);
    const sourcePath = await findExistingPath(localCandidate);

    if (!sourcePath) {
      continue;
    }

    const prefix =
      asset.kind === "OUTPUT"
        ? normalizePrefix(requireEnv("S3_RESULTS_PREFIX"))
        : normalizePrefix(requireEnv("S3_REFERENCES_PREFIX"));
    const objectKey = [
      prefix,
      "migrated",
      asset.taskId,
      `${asset.id}-${sanitizeFileName(path.basename(sourcePath))}`,
    ].join("/");
    const uploaded = await uploadFileToObjectStorage(s3Client, {
      sourcePath,
      objectKey,
      contentType: asset.mimeType,
      cacheControl: asset.kind === "OUTPUT" ? "public, max-age=31536000, immutable" : undefined,
    });

    asset.storageKey = uploaded.objectKey;
    asset.url = uploaded.url;
    report.uploadedFiles.push({
      kind: asset.kind === "OUTPUT" ? "task-output" : "task-input",
      sourcePath,
      objectKey: uploaded.objectKey,
    });
  }

  sqliteRows.TaskAsset = taskAssetRows;
}

async function loadSqliteRows(db) {
  const rows = {};
  for (const tableName of tableOrder) {
    rows[tableName] = db.prepare(`SELECT * FROM ${quoteIdentifier(tableName)}`).all();
  }

  return rows;
}

async function sampleChecks(pool) {
  const checks = {};
  for (const tableName of ["User", "App", "Task", "Material"]) {
    const result = await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)} ORDER BY "createdAt" ASC NULLS LAST LIMIT 1`);
    checks[tableName] = result.rows[0] ?? null;
  }

  const singletonChecks = await Promise.all(
    ["SiteSettings", "IntegrationSettings", "FeishuSettings"].map(async (tableName) => {
      const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(tableName)}`);
      return [tableName, result.rows[0]?.count ?? 0];
    }),
  );

  return {
    samples: checks,
    singletons: Object.fromEntries(singletonChecks),
  };
}

async function writeReport(report) {
  const reportDir = path.join(projectRoot, "reports");
  await mkdir(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(reportDir, `sqlite-to-postgres-${stamp}.json`);
  await writeFile(filePath, JSON.stringify(report, null, 2), "utf8");
  return filePath;
}

async function main() {
  const sqlitePathArg = process.argv[2];
  const sqlitePath = sqlitePathArg
    ? path.resolve(projectRoot, sqlitePathArg)
    : path.join(projectRoot, "dev.db");
  const databaseUrl = process.env.DIRECT_URL?.trim() || requireEnv("DATABASE_URL");
  const sqlite = new Database(sqlitePath, { readonly: true });
  const pg = new Pool({ connectionString: databaseUrl });
  const s3Client = createS3Client();

  const report = {
    sqlitePath,
    startedAt: new Date().toISOString(),
    tableCounts: {},
    insertedCounts: {},
    uploadedFiles: [],
    skippedFiles: [],
    missingFiles: [],
    verification: null,
  };

  try {
    const sqliteRows = await loadSqliteRows(sqlite);
    await migrateMaterialFiles(sqliteRows, s3Client, report);
    await migrateTaskAssetFiles(sqliteRows, s3Client, report);

    for (const tableName of tableOrder) {
      const normalizedRows = sqliteRows[tableName].map((row) => normalizeRow(tableName, row));
      report.tableCounts[tableName] = normalizedRows.length;
      report.insertedCounts[tableName] = await insertRows(pg, tableName, normalizedRows);
    }

    report.verification = await sampleChecks(pg);
    report.finishedAt = new Date().toISOString();
    const reportPath = await writeReport(report);
    console.log(JSON.stringify({ ok: true, reportPath }, null, 2));
  } finally {
    sqlite.close();
    await pg.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
