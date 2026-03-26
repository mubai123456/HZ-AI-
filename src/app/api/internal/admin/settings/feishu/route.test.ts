import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, upsertMock, findUniqueMock, backfillMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  upsertMock: vi.fn(),
  findUniqueMock: vi.fn(),
  backfillMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
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

vi.mock("@/lib/env", () => ({
  env: {
    FEISHU_APP_ID: "env-app-id",
    FEISHU_APP_SECRET: "env-app-secret",
    FEISHU_APP_TOKEN: "env-app-token",
    FEISHU_TABLE_ID: "env-table-id",
  },
}));

import { GET, PUT } from "@/app/api/internal/admin/settings/feishu/route";

describe("admin feishu settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueMock.mockResolvedValue(null);
  });

  it("returns effective env defaults when the db settings are missing", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    findUniqueMock.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      feishuAppId: "env-app-id",
      feishuAppSecret: "env-***cret",
      feishuAppToken: "env-app-token",
      feishuTableId: "env-table-id",
      columnMappings: [],
    });
  });

  it("normalizes mappings on save and triggers a full historical backfill", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    upsertMock.mockResolvedValue({
      id: "default",
      feishuAppId: "db-app-id",
      feishuAppSecret: "db-app-secret",
      feishuAppToken: "db-app-token",
      feishuTableId: "db-table-id",
      columnMappings: [
        { taskField: "allInfo", feishuColumn: "全部信息" },
        { taskField: "taskNo", feishuColumn: "任务编号" },
        { taskField: "createdAt", feishuColumn: "创建时间" },
      ],
    });
    backfillMock.mockResolvedValue({
      processed: 2,
      successCount: 2,
      failureCount: 0,
    });

    const response = await PUT(
      new Request("http://localhost/api/internal/admin/settings/feishu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feishuAppId: "db-app-id",
          feishuAppSecret: "db-app-secret",
          feishuAppToken: "db-app-token",
          feishuTableId: "db-table-id",
          columnMappings: [
            { taskField: "taskNo", feishuColumn: " 任务ID " },
            { taskField: "allInfo", feishuColumn: " 全部信息 " },
            { taskField: "unsupported", feishuColumn: "无效列" },
            { taskField: "taskNo", feishuColumn: "任务编号" },
            { taskField: "createdAt", feishuColumn: " 创建时间 " },
          ],
        }),
      }),
    );
    const data = await response.json();

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: "default" },
      update: {
        feishuAppId: "db-app-id",
        feishuAppSecret: "db-app-secret",
        feishuAppToken: "db-app-token",
        feishuTableId: "db-table-id",
        columnMappings: [
          { taskField: "taskNo", feishuColumn: "任务编号" },
          { taskField: "allInfo", feishuColumn: "全部信息" },
          { taskField: "createdAt", feishuColumn: "创建时间" },
        ],
      },
      create: {
        id: "default",
        feishuAppId: "db-app-id",
        feishuAppSecret: "db-app-secret",
        feishuAppToken: "db-app-token",
        feishuTableId: "db-table-id",
        columnMappings: [
          { taskField: "taskNo", feishuColumn: "任务编号" },
          { taskField: "allInfo", feishuColumn: "全部信息" },
          { taskField: "createdAt", feishuColumn: "创建时间" },
        ],
      },
    });
    expect(backfillMock).toHaveBeenCalledWith({
      actorId: "admin-1",
      mode: "ALL",
    });
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});
