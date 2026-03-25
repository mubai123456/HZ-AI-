import { z } from "zod";

import { TASK_OUTPUT_STORAGE_MODES } from "@/lib/task-output-storage";

const baseEnvSchema = z.object({
  APP_NAME: z.string(),
  APP_ENV: z.enum(["local", "development", "staging", "production", "preview"]),
  APP_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  NODE_ENV: z.enum(["development", "production"]),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  RUNNINGHUB_BASE_URL: z.string().url(),
  RUNNINGHUB_API_KEY: z.string().min(1),
  RUNNINGHUB_WEBAPP_ID: z.string().min(1),
  FEISHU_BASE_URL: z.string().url(),
  FEISHU_APP_ID: z.string().min(1),
  FEISHU_APP_SECRET: z.string().min(1),
  FEISHU_APP_TOKEN: z.string().min(1),
  FEISHU_TABLE_ID: z.string().min(1),
  TASK_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(20),
  RUNNINGHUB_WEBHOOK_SECRET: z.string(),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),
  S3_MATERIALS_PREFIX: z.string().min(1),
  S3_RESULTS_PREFIX: z.string().min(1),
  S3_REFERENCES_PREFIX: z.string().min(1),
  TASK_OUTPUT_STORAGE_MODE: z.enum(TASK_OUTPUT_STORAGE_MODES),
  UPLOAD_SIGN_TTL_SECONDS: z.coerce.number().int().min(30).max(3600),
});

const rawEnv = {
  APP_NAME: process.env.APP_NAME,
  APP_ENV: process.env.APP_ENV,
  APP_URL: process.env.APP_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  RUNNINGHUB_BASE_URL: process.env.RUNNINGHUB_BASE_URL,
  RUNNINGHUB_API_KEY: process.env.RUNNINGHUB_API_KEY,
  RUNNINGHUB_WEBAPP_ID: process.env.RUNNINGHUB_WEBAPP_ID,
  FEISHU_BASE_URL: process.env.FEISHU_BASE_URL,
  FEISHU_APP_ID: process.env.FEISHU_APP_ID,
  FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET,
  FEISHU_APP_TOKEN: process.env.FEISHU_APP_TOKEN,
  FEISHU_TABLE_ID: process.env.FEISHU_TABLE_ID,
  TASK_MAX_CONCURRENCY: process.env.TASK_MAX_CONCURRENCY,
  RUNNINGHUB_WEBHOOK_SECRET: process.env.RUNNINGHUB_WEBHOOK_SECRET,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
  S3_MATERIALS_PREFIX: process.env.S3_MATERIALS_PREFIX,
  S3_RESULTS_PREFIX: process.env.S3_RESULTS_PREFIX,
  S3_REFERENCES_PREFIX: process.env.S3_REFERENCES_PREFIX,
  TASK_OUTPUT_STORAGE_MODE: process.env.TASK_OUTPUT_STORAGE_MODE,
  UPLOAD_SIGN_TTL_SECONDS: process.env.UPLOAD_SIGN_TTL_SECONDS,
};

const fallbackEnv = {
  APP_NAME: "AI Workbench",
  APP_ENV: "local",
  APP_URL: "http://127.0.0.1:3000",
  JWT_SECRET: "local-dev-jwt-secret-please-change",
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54329/ai_workbench_local",
  DIRECT_URL: "postgresql://postgres:postgres@127.0.0.1:54329/ai_workbench_local",
  RUNNINGHUB_BASE_URL: "https://www.runninghub.cn",
  RUNNINGHUB_API_KEY: "replace_with_real_key_locally",
  RUNNINGHUB_WEBAPP_ID: "2027211316242423809",
  FEISHU_BASE_URL: "https://open.feishu.cn",
  FEISHU_APP_ID: "replace_with_real_app_id_locally",
  FEISHU_APP_SECRET: "replace_with_real_app_secret_locally",
  FEISHU_APP_TOKEN: "replace_with_real_app_token_locally",
  FEISHU_TABLE_ID: "replace_with_real_table_id_locally",
  TASK_MAX_CONCURRENCY: 5,
  RUNNINGHUB_WEBHOOK_SECRET: "",
  S3_BUCKET: "ai-workbench-local",
  S3_REGION: "auto",
  S3_ENDPOINT: "https://storage.localhost.invalid",
  S3_ACCESS_KEY_ID: "local-access-key",
  S3_SECRET_ACCESS_KEY: "local-secret-key",
  S3_PUBLIC_BASE_URL: "https://cdn.localhost.invalid",
  S3_MATERIALS_PREFIX: "materials",
  S3_RESULTS_PREFIX: "task-results",
  S3_REFERENCES_PREFIX: "references/uploads",
  TASK_OUTPUT_STORAGE_MODE: "provider_url",
  UPLOAD_SIGN_TTL_SECONDS: 300,
} as const;

const appEnv = rawEnv.APP_ENV ?? fallbackEnv.APP_ENV;
const nodeEnv =
  rawEnv.NODE_ENV === "test" ? "development" : rawEnv.NODE_ENV ?? fallbackEnv.NODE_ENV;
const requiresStrictEnv = appEnv === "production";
const normalizedRawEnv = {
  ...rawEnv,
  NODE_ENV: nodeEnv,
};

export const env = baseEnvSchema.parse(
  requiresStrictEnv
    ? normalizedRawEnv
    : {
        ...fallbackEnv,
        ...Object.fromEntries(Object.entries(normalizedRawEnv).filter(([, value]) => value !== undefined)),
      },
);

export type AppEnv = typeof env;
