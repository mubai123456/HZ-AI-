import { beforeEach, describe, expect, it, vi } from "vitest";

const { integrationFindUniqueMock, feishuFindUniqueMock } = vi.hoisted(() => ({
  integrationFindUniqueMock: vi.fn(),
  feishuFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    APP_NAME: "AI Workbench",
    RUNNINGHUB_BASE_URL: "https://www.runninghub.cn",
    RUNNINGHUB_WEBAPP_ID: "webapp-1",
    FEISHU_BASE_URL: "https://open.feishu.cn",
    FEISHU_APP_TOKEN: "",
    FEISHU_TABLE_ID: "",
    FEISHU_APP_ID: "",
    FEISHU_APP_SECRET: "",
    JWT_SECRET: "",
    RUNNINGHUB_WEBHOOK_SECRET: "",
    TASK_MAX_CONCURRENCY: 5,
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    integrationSettings: {
      findUnique: integrationFindUniqueMock,
    },
    feishuSettings: {
      findUnique: feishuFindUniqueMock,
    },
  },
}));

vi.mock("@/lib/prisma-runtime-diagnostics", () => ({
  isPrismaSchemaMismatchError: () => false,
  logPrismaRuntimeDiagnostic: vi.fn(),
}));

import { getResolvedFeishuSyncSettings, integrationSettingsUpdateSchema } from "@/lib/settings";

describe("integrationSettingsUpdateSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integrationFindUniqueMock.mockResolvedValue(null);
    feishuFindUniqueMock.mockResolvedValue(null);
  });

  it("accepts direct API credentials in admin settings", () => {
    const parsed = integrationSettingsUpdateSchema.parse({
      runninghubDefaultWebappId: "webapp-1",
      runninghubChannels: [
        {
          code: "consumer",
          name: "标准通道",
          credentialMode: "DIRECT",
          apiKey: "a5fa88f5502f4fc0820a4e9f0c32855e",
          concurrencyLimit: 5,
          priority: 1,
          enabled: true,
        },
      ],
      feishuBaseUrl: "https://open.feishu.cn",
      feishuAppId: "",
      feishuAppSecret: "",
      feishuAppToken: "",
      feishuTableId: "",
    });

    expect(parsed.runninghubChannels[0]).toMatchObject({
      credentialMode: "DIRECT",
      apiKey: "a5fa88f5502f4fc0820a4e9f0c32855e",
    });
  });

  it("returns a readable validation error when API credentials are missing", () => {
    const result = integrationSettingsUpdateSchema.safeParse({
      runninghubDefaultWebappId: "webapp-1",
      runninghubChannels: [
        {
          code: "consumer",
          name: "标准通道",
          credentialMode: "DIRECT",
          apiKey: "",
          concurrencyLimit: 5,
          priority: 1,
          enabled: true,
        },
      ],
      feishuBaseUrl: "https://open.feishu.cn",
      feishuAppId: "",
      feishuAppSecret: "",
      feishuAppToken: "",
      feishuTableId: "",
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0]?.message).toBe("API 凭据不能为空");
  });

  it("resolves Feishu app credentials from saved settings before env fallbacks", async () => {
    feishuFindUniqueMock.mockResolvedValue({
      feishuAppId: "cli_saved_app_id",
      feishuAppSecret: "cli_saved_app_secret",
      feishuAppToken: "saved_table_app_token",
      feishuTableId: "saved_table_id",
      columnMappings: [],
    });

    const resolved = await getResolvedFeishuSyncSettings();

    expect(resolved).toEqual({
      feishuAppId: "cli_saved_app_id",
      feishuAppSecret: "cli_saved_app_secret",
      feishuAppToken: "saved_table_app_token",
      feishuTableId: "saved_table_id",
      columnMappings: [],
    });
  });
});
