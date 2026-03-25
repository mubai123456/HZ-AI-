import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, bulkOperateTasksMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  bulkOperateTasksMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/db/tasks", () => ({
  bulkOperateTasks: bulkOperateTasksMock,
}));

import { POST } from "@/app/api/internal/admin/tasks/bulk/route";

describe("admin task bulk route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches bulk task sync retries", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    bulkOperateTasksMock.mockResolvedValue({
      results: [{ id: "task-1", status: "success", message: "同步成功" }],
      summary: {
        totalCount: 1,
        successCount: 1,
        skippedCount: 0,
        failureCount: 0,
      },
    });

    const response = await POST(
      new Request("http://localhost/api/internal/admin/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: ["task-1"],
          action: { type: "retrySync" },
        }),
      }),
    );
    const data = await response.json();

    expect(bulkOperateTasksMock).toHaveBeenCalledWith({
      ids: ["task-1"],
      action: { type: "retrySync" },
      operatorId: "admin-1",
    });
    expect(response.status).toBe(200);
    expect(data.summary.successCount).toBe(1);
  });
});
