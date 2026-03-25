import {
  RUNTIME_APP_ENV_KEYS,
  VERCEL_AUTH_KEYS,
  buildProjectLinkPayload,
  parseEnvFile,
  validateDeploymentEnv,
} from "@/lib/vercel-deploy.mjs";

describe("parseEnvFile", () => {
  it("parses key value pairs and ignores comments", () => {
    const parsed = parseEnvFile(`
# comment
APP_ENV=production
APP_URL="https://example.com"
JWT_SECRET='super-secret'
EMPTY=
    `);

    expect(parsed).toEqual({
      APP_ENV: "production",
      APP_URL: "https://example.com",
      JWT_SECRET: "super-secret",
      EMPTY: "",
    });
  });
});

describe("validateDeploymentEnv", () => {
  const baseEnv = {
    VERCEL_TOKEN: "token",
    VERCEL_ORG_ID: "team_123",
    VERCEL_PROJECT_ID: "prj_123",
    APP_NAME: "AI Workbench",
    APP_ENV: "production",
    APP_URL: "https://example.com",
    JWT_SECRET: "1234567890123456",
    DATABASE_URL: "postgresql://user:pass@host:5432/db",
    DIRECT_URL: "postgresql://user:pass@host:5432/db?pgbouncer=false",
    RUNNINGHUB_BASE_URL: "https://www.runninghub.cn",
    RUNNINGHUB_API_KEY: "rh-key",
    RUNNINGHUB_WEBAPP_ID: "app-id",
    FEISHU_BASE_URL: "https://open.feishu.cn",
    FEISHU_APP_ID: "feishu-id",
    FEISHU_APP_SECRET: "feishu-secret",
    FEISHU_APP_TOKEN: "feishu-token",
    FEISHU_TABLE_ID: "tbl_123",
    TASK_MAX_CONCURRENCY: "5",
    RUNNINGHUB_WEBHOOK_SECRET: "webhook-secret",
    S3_BUCKET: "bucket",
    S3_REGION: "auto",
    S3_ENDPOINT: "https://example.r2.cloudflarestorage.com",
    S3_ACCESS_KEY_ID: "access-key",
    S3_SECRET_ACCESS_KEY: "secret-key",
    S3_PUBLIC_BASE_URL: "https://cdn.example.com",
    S3_MATERIALS_PREFIX: "materials",
    S3_RESULTS_PREFIX: "task-results",
    S3_REFERENCES_PREFIX: "references/uploads",
    TASK_OUTPUT_STORAGE_MODE: "provider_url",
    UPLOAD_SIGN_TTL_SECONDS: "300",
  };

  it("reports missing required auth and app values", () => {
    const result = validateDeploymentEnv({
      target: "preview",
      env: {},
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        `Missing Vercel auth key: ${VERCEL_AUTH_KEYS[0]}`,
        `Missing app config key: ${RUNTIME_APP_ENV_KEYS[0]}`,
      ]),
    );
  });

  it("blocks production deploys that still use sqlite file storage", () => {
    const result = validateDeploymentEnv({
      target: "production",
      env: {
        ...baseEnv,
        DATABASE_URL: "file:./dev.db",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Vercel deploys require DATABASE_URL to point to PostgreSQL.",
        "Vercel deploys do not support SQLite file storage. Switch DATABASE_URL to PostgreSQL.",
      ]),
    );
  });

  it("requires DIRECT_URL and object storage config for production deploys", () => {
    const result = validateDeploymentEnv({
      target: "production",
      env: {
        ...baseEnv,
        DIRECT_URL: "",
        S3_BUCKET: "",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Missing app config key: DIRECT_URL",
        "Missing app config key: S3_BUCKET",
      ]),
    );
  });

  it("blocks preview deploys with sqlite as well", () => {
    const result = validateDeploymentEnv({
      target: "preview",
      env: {
        ...baseEnv,
        APP_ENV: "staging",
        DATABASE_URL: "file:./dev.db",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Vercel deploys do not support SQLite file storage. Switch DATABASE_URL to PostgreSQL.",
    );
  });

  it("rejects invalid task output storage modes", () => {
    const result = validateDeploymentEnv({
      target: "preview",
      env: {
        ...baseEnv,
        APP_ENV: "staging",
        TASK_OUTPUT_STORAGE_MODE: "something_else",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      'TASK_OUTPUT_STORAGE_MODE must be either "provider_url" or "object_storage".',
    );
  });

  it("blocks production deploys that still point at a Qiniu test domain", () => {
    const result = validateDeploymentEnv({
      target: "production",
      env: {
        ...baseEnv,
        S3_PUBLIC_BASE_URL: "https://demo.hn-bkt.clouddn.com",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Production deploy cannot use a Qiniu test domain for S3_PUBLIC_BASE_URL. Bind your own HTTPS custom domain first.",
    );
  });
});

describe("buildProjectLinkPayload", () => {
  it("serializes the minimal .vercel/project.json payload", () => {
    expect(
      buildProjectLinkPayload({
        orgId: "team_123",
        projectId: "prj_123",
      }),
    ).toBe('{\n  "orgId": "team_123",\n  "projectId": "prj_123"\n}\n');
  });
});
