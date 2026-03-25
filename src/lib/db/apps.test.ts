import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  appFindUniqueMock,
  appUpdateMock,
  transactionMock,
  txTaskFindManyMock,
  txSyncLogDeleteManyMock,
  txTaskAssetDeleteManyMock,
  txTaskDeleteManyMock,
  txAppDeleteMock,
} = vi.hoisted(() => ({
  appFindUniqueMock: vi.fn(),
  appUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
  txTaskFindManyMock: vi.fn(),
  txSyncLogDeleteManyMock: vi.fn(),
  txTaskAssetDeleteManyMock: vi.fn(),
  txTaskDeleteManyMock: vi.fn(),
  txAppDeleteMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    app: {
      findUnique: appFindUniqueMock,
      update: appUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { bulkOperateApps, deleteAppWithRelationsByCode, mapDbAppToDefinition } from "@/lib/db/apps";

describe("app deletion helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        task: {
          findMany: txTaskFindManyMock,
          deleteMany: txTaskDeleteManyMock,
        },
        syncLog: {
          deleteMany: txSyncLogDeleteManyMock,
        },
        taskAsset: {
          deleteMany: txTaskAssetDeleteManyMock,
        },
        app: {
          delete: txAppDeleteMock,
        },
      }),
    );
  });

  it("deletes app tasks and related records in a single cascade operation", async () => {
    appFindUniqueMock.mockResolvedValue({
      id: "app-1",
      code: "task-visibility-shared",
      name: "任务测试应用",
    });
    txTaskFindManyMock.mockResolvedValue([{ id: "task-1" }, { id: "task-2" }]);
    txSyncLogDeleteManyMock.mockResolvedValue({ count: 2 });
    txTaskAssetDeleteManyMock.mockResolvedValue({ count: 3 });
    txTaskDeleteManyMock.mockResolvedValue({ count: 2 });
    txAppDeleteMock.mockResolvedValue({ id: "app-1" });

    const result = await deleteAppWithRelationsByCode("task-visibility-shared");

    expect(appFindUniqueMock).toHaveBeenCalledWith({
      where: { code: "task-visibility-shared" },
      select: { id: true, code: true, name: true },
    });
    expect(txTaskFindManyMock).toHaveBeenCalledWith({
      where: { appId: "app-1" },
      select: { id: true },
    });
    expect(txSyncLogDeleteManyMock).toHaveBeenCalledWith({
      where: { taskId: { in: ["task-1", "task-2"] } },
    });
    expect(txTaskAssetDeleteManyMock).toHaveBeenCalledWith({
      where: { taskId: { in: ["task-1", "task-2"] } },
    });
    expect(txTaskDeleteManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["task-1", "task-2"] } },
    });
    expect(txAppDeleteMock).toHaveBeenCalledWith({ where: { id: "app-1" } });
    expect(result).toEqual({
      app: {
        id: "app-1",
        code: "task-visibility-shared",
        name: "任务测试应用",
      },
      summary: {
        tasksDeleted: 2,
        syncLogsDeleted: 2,
        taskAssetsDeleted: 3,
      },
    });
  });

  it("uses cascade deletion during bulk delete actions", async () => {
    appFindUniqueMock
      .mockResolvedValueOnce({
        id: "app-1",
        code: "task-visibility-shared",
        name: "任务测试应用",
      })
      .mockResolvedValueOnce({
        id: "app-1",
        code: "task-visibility-shared",
        name: "任务测试应用",
      });
    txTaskFindManyMock.mockResolvedValue([{ id: "task-1" }]);
    txSyncLogDeleteManyMock.mockResolvedValue({ count: 1 });
    txTaskAssetDeleteManyMock.mockResolvedValue({ count: 1 });
    txTaskDeleteManyMock.mockResolvedValue({ count: 1 });
    txAppDeleteMock.mockResolvedValue({ id: "app-1" });

    const result = await bulkOperateApps({
      ids: ["app-1"],
      action: { type: "delete" },
    });

    expect(result.summary.successCount).toBe(1);
    expect(result.results[0]?.status).toBe("success");
    expect(txAppDeleteMock).toHaveBeenCalledWith({ where: { id: "app-1" } });
  });

  it("updates app sort orders during bulk sort actions", async () => {
    appFindUniqueMock
      .mockResolvedValueOnce({
        id: "app-1",
        code: "zebra",
        name: "Zebra Painter",
      })
      .mockResolvedValueOnce({
        id: "app-2",
        code: "alpha",
        name: "Alpha Studio",
      });
    appUpdateMock.mockResolvedValue({});

    const result = await bulkOperateApps({
      ids: ["app-1", "app-2"],
      action: { type: "setSortOrder", startSortOrder: 100 },
    });

    expect(appUpdateMock).toHaveBeenNthCalledWith(1, {
      where: { id: "app-1" },
      data: { sortOrder: 100 },
    });
    expect(appUpdateMock).toHaveBeenNthCalledWith(2, {
      where: { id: "app-2" },
      data: { sortOrder: 101 },
    });
    expect(result.summary.successCount).toBe(2);
  });

  it("maps showcase images to an array and falls back to empty when null", () => {
    const definition = mapDbAppToDefinition({
      id: "app-1",
      code: "showcase-demo",
      name: "Showcase Demo",
      description: "",
      provider: "RUNNINGHUB",
      providerAppId: "provider-1",
      enabled: true,
      shareResults: false,
      estimatedPriceFen: 0,
      formSchemaJson: [],
      requestMappingJson: {},
      defaultParamsJson: {},
      syncMappingJson: {},
      runninghubAllowedChannelCodesJson: null,
      iconUrl: null,
      iconBgColor: null,
      category: null,
      coverPoster: null,
      authorName: null,
      authorAvatar: null,
      badgeLabel: null,
      showcaseImagesJson: null,
      sortOrder: 0,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    } as never);

    expect(definition.showcaseImages).toEqual([]);
  });
});
