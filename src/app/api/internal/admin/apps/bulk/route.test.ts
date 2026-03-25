import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, bulkOperateAppsMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  bulkOperateAppsMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/db/apps", () => ({
  bulkOperateApps: bulkOperateAppsMock,
}));

import { POST } from "@/app/api/internal/admin/apps/bulk/route";

describe("admin app bulk route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts bulk sort order updates", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    bulkOperateAppsMock.mockResolvedValue({
      results: [{ id: "app-1", status: "success", message: "ok" }],
      summary: { totalCount: 1, successCount: 1, skippedCount: 0, failureCount: 0 },
    });

    const response = await POST(
      new Request("http://localhost/api/internal/admin/apps/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: ["app-1"],
          action: { type: "setSortOrder", startSortOrder: 10 },
        }),
      }),
    );
    const data = await response.json();

    expect(bulkOperateAppsMock).toHaveBeenCalledWith({
      ids: ["app-1"],
      action: { type: "setSortOrder", startSortOrder: 10 },
    });
    expect(response.status).toBe(200);
    expect(data.summary.successCount).toBe(1);
  });
});
