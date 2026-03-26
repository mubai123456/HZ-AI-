import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentSessionMock,
  getResolvedIntegrationSettingsMock,
  getResolvedFeishuSyncSettingsMock,
  saveIntegrationSettingsMock,
  findUniqueMock,
  upsertMock,
  backfillMock,
  resolveFeishuSyncConfigMock,
  mappingRecordToEntriesMock,
  normalizeFeishuColumnMappingsMock,
} = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  getResolvedIntegrationSettingsMock: vi.fn(),
  getResolvedFeishuSyncSettingsMock: vi.fn(),
  saveIntegrationSettingsMock: vi.fn(),
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
  backfillMock: vi.fn(),
  resolveFeishuSyncConfigMock: vi.fn(),
  mappingRecordToEntriesMock: vi.fn(),
  normalizeFeishuColumnMappingsMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/settings", () => ({
  getResolvedIntegrationSettings: getResolvedIntegrationSettingsMock,
  getResolvedFeishuSyncSettings: getResolvedFeishuSyncSettingsMock,
  saveIntegrationSettings: saveIntegrationSettingsMock,
  integrationSettingsUpdateSchema: {
    parse: (input: unknown) => input,
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feishuSettings: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
    },
  },
}));

vi.mock("@/lib/feishu-sync-jobs", () => ({
  backfillFeishuSyncForTasks: backfillMock,
}));

vi.mock("@/lib/feishu-sync", () => ({
  resolveFeishuSyncConfig: resolveFeishuSyncConfigMock,
  mappingRecordToEntries: mappingRecordToEntriesMock,
  normalizeFeishuColumnMappings: normalizeFeishuColumnMappingsMock,
}));

vi.mock("@/lib/env", () => ({
  env: {
    FEISHU_APP_ID: "env-app-id",
    FEISHU_APP_TOKEN: "env-app-token",
    FEISHU_TABLE_ID: "env-table-id",
    FEISHU_APP_SECRET: "env-app-secret",
  },
}));

import { GET, PUT } from "@/app/api/internal/admin/settings/integrations/route";

describe("admin integrations settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueMock.mockResolvedValue(null);
  });

  it("returns merged integration settings", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    getResolvedIntegrationSettingsMock.mockResolvedValue({
      runninghubDefaultWebappId: "webapp-1",
      runninghubChannels: [
        {
          code: "consumer",
          name: "标准通道",
          credentialMode: "ENV",
          apiKey: "RUNNINGHUB_API_KEY",
          concurrencyLimit: 5,
          priority: 1,
          enabled: true,
        },
      ],
      feishuBaseUrl: "https://open.feishu.cn",
    });
    getResolvedFeishuSyncSettingsMock.mockResolvedValue({
      feishuAppId: "db-app-id",
      feishuAppSecret: "db-app-secret",
      feishuAppToken: "db-app-token",
      feishuTableId: "db-table-id",
      columnMappings: [{ taskField: "taskNo", feishuColumn: "Task Number" }],
    });
    resolveFeishuSyncConfigMock.mockReturnValue({
      target: {
        appToken: "db-app-token",
        tableId: "db-table-id",
      },
      globalMapping: { taskNo: "Task Number" },
    });
    mappingRecordToEntriesMock.mockReturnValue([{ taskField: "taskNo", feishuColumn: "Task Number" }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.runninghubBaseUrl).toBeUndefined();
    expect(data.runninghubChannels).toHaveLength(1);
    expect(data.feishuAppId).toBe("db-app-id");
    expect(data.feishuAppSecret).toBe("db-a***cret");
    expect(data.feishuAppToken).toBe("db-app-token");
    expect(data.columnMappings).toEqual([{ taskField: "taskNo", feishuColumn: "Task Number" }]);
  });

  it("masks direct API credentials when loading admin settings", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    getResolvedIntegrationSettingsMock.mockResolvedValue({
      runninghubBaseUrl: "https://rh.example.com",
      runninghubDefaultWebappId: "webapp-1",
      runninghubChannels: [
        {
          code: "enterprise",
          name: "高级通道",
          credentialMode: "DIRECT",
          apiKey: "enterprise-live-key",
          concurrencyLimit: 10,
          priority: 1,
          enabled: true,
        },
      ],
      feishuBaseUrl: "https://open.feishu.cn",
    });
    getResolvedFeishuSyncSettingsMock.mockResolvedValue({
      feishuAppId: "",
      feishuAppSecret: "",
      feishuAppToken: "",
      feishuTableId: "",
      columnMappings: [],
    });
    resolveFeishuSyncConfigMock.mockReturnValue({
      target: { appToken: "", tableId: "" },
      globalMapping: {},
    });
    mappingRecordToEntriesMock.mockReturnValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.runninghubChannels[0]?.apiKey).toBe("ente***-key");
  });

  it("persists integration settings with structured mappings and triggers backfill", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    saveIntegrationSettingsMock.mockResolvedValue(undefined);
    normalizeFeishuColumnMappingsMock.mockReturnValue({
      taskNo: "Task Number",
      status: "Task Status",
      promptTemplateName: "Prompt Template",
    });
    mappingRecordToEntriesMock.mockReturnValue([
      { taskField: "taskNo", feishuColumn: "Task Number" },
      { taskField: "status", feishuColumn: "Task Status" },
      { taskField: "promptTemplateName", feishuColumn: "Prompt Template" },
    ]);
    upsertMock.mockResolvedValue(undefined);
    backfillMock.mockResolvedValue({ processed: 3 });
    getResolvedIntegrationSettingsMock.mockResolvedValue({
      runninghubDefaultWebappId: "webapp-1",
      runninghubChannels: [
        {
          code: "consumer",
          name: "标准通道",
          credentialMode: "ENV",
          apiKey: "RUNNINGHUB_API_KEY",
          concurrencyLimit: 5,
          priority: 1,
          enabled: true,
        },
        {
          code: "enterprise",
          name: "高级通道",
          credentialMode: "DIRECT",
          apiKey: "enterprise-live-key",
          concurrencyLimit: 100,
          priority: 2,
          enabled: true,
        },
      ],
      feishuBaseUrl: "https://open.feishu.cn",
    });
    getResolvedFeishuSyncSettingsMock.mockResolvedValue({
      feishuAppId: "db-app-id",
      feishuAppSecret: "db-app-secret",
      feishuAppToken: "db-app-token",
      feishuTableId: "db-table-id",
      columnMappings: [
        { taskField: "taskNo", feishuColumn: "Task Number" },
        { taskField: "status", feishuColumn: "Task Status" },
        { taskField: "promptTemplateName", feishuColumn: "Prompt Template" },
      ],
    });

    const response = await PUT(
      new Request("http://localhost/api/internal/admin/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runninghubDefaultWebappId: "webapp-1",
          runninghubChannels: [
            {
              code: "consumer",
              name: "标准通道",
              credentialMode: "ENV",
              apiKey: "RUNNINGHUB_API_KEY",
              concurrencyLimit: 5,
              priority: 1,
              enabled: true,
            },
            {
              code: "enterprise",
              name: "高级通道",
              credentialMode: "DIRECT",
              apiKey: "enterprise-live-key",
              concurrencyLimit: 100,
              priority: 2,
              enabled: true,
            },
          ],
          feishuBaseUrl: "https://open.feishu.cn",
          feishuAppId: "db-app-id",
          feishuAppSecret: "db-app-secret",
          feishuAppToken: "db-app-token",
          feishuTableId: "db-table-id",
          columnMappings: [
            { taskField: "taskNo", feishuColumn: "Task Number" },
            { taskField: "status", feishuColumn: "Task Status" },
            { taskField: "promptTemplateName", feishuColumn: "Prompt Template" },
          ],
        }),
      }),
    );
    const data = await response.json();

    expect(saveIntegrationSettingsMock).toHaveBeenCalledWith({
      runninghubDefaultWebappId: "webapp-1",
      runninghubChannels: [
        {
          code: "consumer",
          name: "标准通道",
          credentialMode: "ENV",
          apiKey: "RUNNINGHUB_API_KEY",
          concurrencyLimit: 5,
          priority: 1,
          enabled: true,
        },
        {
          code: "enterprise",
          name: "高级通道",
          credentialMode: "DIRECT",
          apiKey: "enterprise-live-key",
          concurrencyLimit: 100,
          priority: 2,
          enabled: true,
        },
      ],
      feishuBaseUrl: "https://open.feishu.cn",
      feishuAppId: "db-app-id",
      feishuAppSecret: "db-app-secret",
      feishuAppToken: "db-app-token",
      feishuTableId: "db-table-id",
      columnMappings: [
        { taskField: "taskNo", feishuColumn: "Task Number" },
        { taskField: "status", feishuColumn: "Task Status" },
        { taskField: "promptTemplateName", feishuColumn: "Prompt Template" },
      ],
    });
    expect(normalizeFeishuColumnMappingsMock).toHaveBeenCalledWith(
      [
        { taskField: "taskNo", feishuColumn: "Task Number" },
        { taskField: "status", feishuColumn: "Task Status" },
        { taskField: "promptTemplateName", feishuColumn: "Prompt Template" },
      ],
      expect.any(Object),
    );
    expect(upsertMock).toHaveBeenCalled();
    expect(backfillMock).toHaveBeenCalledWith({
      actorId: "admin-1",
      mode: "ALL",
    });
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});
