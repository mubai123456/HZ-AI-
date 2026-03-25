import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, bulkOperateMaterialsMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  bulkOperateMaterialsMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/db/materials", () => ({
  bulkOperateMaterials: bulkOperateMaterialsMock,
}));

import { POST } from "@/app/api/internal/admin/materials/bulk/route";

describe("admin material bulk route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches bulk tag updates", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    bulkOperateMaterialsMock.mockResolvedValue({
      items: [
        { materialId: "mat-1", status: "success", message: "updated" },
        { materialId: "mat-2", status: "success", message: "updated" },
      ],
      summary: {
        totalCount: 2,
        successCount: 2,
        skippedCount: 0,
        failureCount: 0,
      },
    });

    const response = await POST(
      new Request("http://localhost/api/internal/admin/materials/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialIds: ["mat-1", "mat-2"],
          action: {
            type: "updateTags",
            tags: ["短视频", "夏装"],
          },
        }),
      }),
    );
    const data = await response.json();

    expect(bulkOperateMaterialsMock).toHaveBeenCalledWith({
      actorId: "admin-1",
      materialIds: ["mat-1", "mat-2"],
      action: {
        type: "updateTags",
        tags: ["短视频", "夏装"],
      },
    });
    expect(response.status).toBe(200);
    expect(data.summary.successCount).toBe(2);
  });
});
