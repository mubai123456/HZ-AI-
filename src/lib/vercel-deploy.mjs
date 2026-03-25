export const VERCEL_AUTH_KEYS = ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"];

export const RUNTIME_APP_ENV_KEYS = [
  "APP_NAME",
  "APP_ENV",
  "APP_URL",
  "JWT_SECRET",
  "DATABASE_URL",
  "DIRECT_URL",
  "RUNNINGHUB_BASE_URL",
  "RUNNINGHUB_API_KEY",
  "RUNNINGHUB_WEBAPP_ID",
  "FEISHU_BASE_URL",
  "FEISHU_APP_ID",
  "FEISHU_APP_SECRET",
  "FEISHU_APP_TOKEN",
  "FEISHU_TABLE_ID",
  "TASK_MAX_CONCURRENCY",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_BASE_URL",
  "S3_MATERIALS_PREFIX",
  "S3_RESULTS_PREFIX",
  "S3_REFERENCES_PREFIX",
  "TASK_OUTPUT_STORAGE_MODE",
  "UPLOAD_SIGN_TTL_SECONDS",
];

export const OPTIONAL_RUNTIME_ENV_KEYS = ["RUNNINGHUB_WEBHOOK_SECRET"];
export const LOCAL_PRECHECK_ENV_KEYS = ["TEST_DATABASE_URL"];
export const BOOTSTRAP_ENV_KEYS = ["BOOTSTRAP_ADMIN_USERNAME", "BOOTSTRAP_ADMIN_PASSWORD"];

function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function parseEnvFile(contents) {
  const result = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1);
    if (!key) {
      continue;
    }

    result[key] = stripWrappingQuotes(rawValue);
  }

  return result;
}

export function buildProjectLinkPayload({ orgId, projectId }) {
  return `${JSON.stringify({ orgId, projectId }, null, 2)}\n`;
}

export function normalizeTarget(target) {
  return target === "production" ? "production" : "preview";
}

export function isProvided(value) {
  return String(value ?? "").trim().length > 0;
}

export function isPostgresUrl(value) {
  return /^postgres(ql)?:\/\//i.test(String(value ?? "").trim());
}

export function isValidTaskOutputStorageMode(value) {
  return ["provider_url", "object_storage"].includes(String(value ?? "").trim());
}

export function isQiniuTestDomainUrl(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return false;
  }

  try {
    const url = new URL(normalized);
    return ["clouddn.com", "qiniucdn.com", "qnssl.com", "qbox.me"].some(
      (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export function getDatabaseName(connectionString) {
  const normalized = String(connectionString ?? "").trim();
  if (!normalized) {
    return "";
  }

  try {
    const url = new URL(normalized);
    return url.pathname.replace(/^\/+/, "");
  } catch {
    return "";
  }
}

export function looksLikeTestDatabaseName(databaseName) {
  return /(?:^|[_-])test(?:$|[_-])/i.test(databaseName) || /test$/i.test(databaseName);
}

export function getSyncedAppEnvKeys() {
  return [...RUNTIME_APP_ENV_KEYS];
}

export function validateDeploymentEnv({ env, target }) {
  const errors = [];
  const warnings = [];
  const normalizedTarget = normalizeTarget(target);
  const syncedKeys = getSyncedAppEnvKeys(normalizedTarget);

  for (const key of VERCEL_AUTH_KEYS) {
    if (!isProvided(env[key])) {
      errors.push(`Missing Vercel auth key: ${key}`);
    }
  }

  for (const key of syncedKeys) {
    if (!isProvided(env[key])) {
      errors.push(`Missing app config key: ${key}`);
    }
  }

  const appEnv = String(env.APP_ENV ?? "").trim();
  const appUrl = String(env.APP_URL ?? "").trim();
  const databaseUrl = String(env.DATABASE_URL ?? "").trim();
  const databaseName = getDatabaseName(databaseUrl);
  const webhookSecret = String(env.RUNNINGHUB_WEBHOOK_SECRET ?? "").trim();
  const publicAssetBaseUrl = String(env.S3_PUBLIC_BASE_URL ?? "").trim();
  const taskOutputStorageMode = String(env.TASK_OUTPUT_STORAGE_MODE ?? "").trim();

  if (normalizedTarget === "production" && appEnv !== "production") {
    errors.push("Production deploy requires APP_ENV=production.");
  }

  if (normalizedTarget === "preview" && !["development", "staging", "preview"].includes(appEnv)) {
    warnings.push("Preview deploy is usually safer with APP_ENV set to staging, preview, or development.");
  }

  if (!isPostgresUrl(databaseUrl)) {
    errors.push("Vercel deploys require DATABASE_URL to point to PostgreSQL.");
  }

  if (databaseUrl.startsWith("file:")) {
    errors.push("Vercel deploys do not support SQLite file storage. Switch DATABASE_URL to PostgreSQL.");
  }

  if (!appUrl.startsWith("https://")) {
    if (normalizedTarget === "production") {
      errors.push("Production deploy requires APP_URL to use https://.");
    } else {
      warnings.push("Preview deploy should use an https APP_URL so RunningHub callbacks can reach the deployment.");
    }
  }

  if (!publicAssetBaseUrl.startsWith("https://")) {
    if (normalizedTarget === "production") {
      errors.push("Production deploy requires S3_PUBLIC_BASE_URL to use https://.");
    } else {
      warnings.push("Preview deploy should use an https S3_PUBLIC_BASE_URL for browser uploads and media access.");
    }
  }

  if (!isValidTaskOutputStorageMode(taskOutputStorageMode)) {
    errors.push('TASK_OUTPUT_STORAGE_MODE must be either "provider_url" or "object_storage".');
  }

  if (isQiniuTestDomainUrl(publicAssetBaseUrl)) {
    if (normalizedTarget === "production") {
      errors.push(
        "Production deploy cannot use a Qiniu test domain for S3_PUBLIC_BASE_URL. Bind your own HTTPS custom domain first.",
      );
    } else {
      warnings.push(
        "Preview deploy is using a Qiniu test domain. It is fine for short-lived testing only; use a custom HTTPS domain before production.",
      );
    }
  }

  if (normalizedTarget === "production" && !isProvided(webhookSecret)) {
    errors.push("Production deploy requires RUNNINGHUB_WEBHOOK_SECRET.");
  }

  if (normalizedTarget === "preview" && !isProvided(webhookSecret)) {
    warnings.push("Preview deploy is missing RUNNINGHUB_WEBHOOK_SECRET. RunningHub webhook verification will be skipped.");
  }

  if (databaseName) {
    if (normalizedTarget === "production" && looksLikeTestDatabaseName(databaseName)) {
      errors.push(`Production deploy cannot target a test database (${databaseName}).`);
    }

    if (normalizedTarget === "preview" && looksLikeTestDatabaseName(databaseName)) {
      warnings.push(
        `Preview deploy is pointing at a test database (${databaseName}). Use a dedicated preview/staging database if possible.`,
      );
    }
  } else if (isPostgresUrl(databaseUrl)) {
    warnings.push("DATABASE_URL could not be parsed for a database name. Double-check that it targets the intended Postgres database.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    syncedKeys,
    target: normalizedTarget,
  };
}

export function validateLocalPreflightEnv({ env, runTests = true, runBootstrap = true }) {
  const errors = [];
  const warnings = [];

  if (runTests) {
    const testDatabaseUrl = String(env.TEST_DATABASE_URL ?? "").trim();
    if (!testDatabaseUrl) {
      errors.push(
        "Local preflight requires TEST_DATABASE_URL so npm test can run against a dedicated Postgres test database.",
      );
    } else if (!isPostgresUrl(testDatabaseUrl)) {
      errors.push("TEST_DATABASE_URL must point to PostgreSQL.");
    } else {
      const databaseName = getDatabaseName(testDatabaseUrl);
      if (!looksLikeTestDatabaseName(databaseName)) {
        errors.push(
          `TEST_DATABASE_URL must point to a dedicated test database. Received database "${databaseName || "<unknown>"}".`,
        );
      }
    }
  }

  if (runBootstrap) {
    for (const key of BOOTSTRAP_ENV_KEYS) {
      if (!isProvided(env[key])) {
        errors.push(`Missing local bootstrap key: ${key}`);
      }
    }

    const dailyClaimLimit = String(env.BOOTSTRAP_ADMIN_DAILY_CLAIM_LIMIT ?? "").trim();
    if (dailyClaimLimit && Number.isNaN(Number(dailyClaimLimit))) {
      warnings.push("BOOTSTRAP_ADMIN_DAILY_CLAIM_LIMIT is not numeric. bootstrap:admin will fall back to 3.");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
