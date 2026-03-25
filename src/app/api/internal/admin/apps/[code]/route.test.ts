import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentSessionMock,
  findUniqueMock,
  updateMock,
  backfillMock,
  deleteAppWithRelationsByCodeMock,
} = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  backfillMock: vi.fn(),
  deleteAppWithRelationsByCodeMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    app: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
  },
}));

vi.mock("@/lib/db/apps", () => ({
  deleteAppWithRelationsByCode: deleteAppWithRelationsByCodeMock,
}));

vi.mock("@/lib/feishu-sync-jobs", () => ({
  backfillFeishuSyncForTasks: backfillMock,
}));

import { DELETE, PUT } from "@/app/api/internal/admin/apps/[code]/route";

describe("admin app sync settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes app sync mappings and fully backfills that app", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    findUniqueMock.mockResolvedValue({
      formSchemaJson: [{ key: "prompt", label: "Prompt", type: "textarea" }],
    });
    updateMock.mockResolvedValue({
      id: "app-1",
      code: "all-in-one-image-2",
      tags: [],
    });
    backfillMock.mockResolvedValue({
      processed: 1,
      successCount: 1,
      failureCount: 0,
    });

    const response = await PUT(
      new Request("http://localhost/api/internal/admin/apps/all-in-one-image-2", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runninghubAllowedChannelCodesJson: ["consumer", "enterprise", "consumer"],
          showcaseImages: [
            "https://example.com/showcase-1.png",
            "https://example.com/showcase-2.png",
          ],
          syncMappingJson: {
            allInfo: " All Info ",
            status: " Task Status ",
            "params.prompt": " Prompt Column ",
            invalidField: "Ignored",
            createdAt: "Created At",
          },
        }),
      }),
      { params: Promise.resolve({ code: "all-in-one-image-2" }) },
    );
    const data = await response.json();

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: "all-in-one-image-2" },
        data: expect.objectContaining({
          runninghubAllowedChannelCodesJson: ["consumer", "enterprise"],
          showcaseImagesJson: [
            "https://example.com/showcase-1.png",
            "https://example.com/showcase-2.png",
          ],
          syncMappingJson: {
            allInfo: "All Info",
            status: "Task Status",
            "params.prompt": "Prompt Column",
            createdAt: "Created At",
          },
        }),
      }),
    );
    expect(backfillMock).toHaveBeenCalledWith({
      appId: "app-1",
      actorId: "admin-1",
      mode: "ALL",
    });
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("returns cascade deletion summary for single app delete", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    deleteAppWithRelationsByCodeMock.mockResolvedValue({
      app: {
        id: "app-1",
        code: "task-visibility-shared",
        name: "Task Visibility Demo",
      },
      summary: {
        tasksDeleted: 2,
        syncLogsDeleted: 3,
        taskAssetsDeleted: 4,
      },
    });

    const response = await DELETE(
      new Request("http://localhost/api/internal/admin/apps/task-visibility-shared", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ code: "task-visibility-shared" }) },
    );
    const data = await response.json();

    expect(deleteAppWithRelationsByCodeMock).toHaveBeenCalledWith("task-visibility-shared");
    expect(response.status).toBe(200);
    expect(data).toEqual({
      ok: true,
      app: {
        id: "app-1",
        code: "task-visibility-shared",
        name: "Task Visibility Demo",
      },
      summary: {
        tasksDeleted: 2,
        syncLogsDeleted: 3,
        taskAssetsDeleted: 4,
      },
    });
  });
});
