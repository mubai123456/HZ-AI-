import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, submitNewTaskMock, getTaskByIdMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  submitNewTaskMock: vi.fn(),
  getTaskByIdMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/task-queue", () => ({
  submitNewTask: submitNewTaskMock,
}));

vi.mock("@/lib/db/tasks", () => ({
  getTaskById: getTaskByIdMock,
}));

import { POST } from "@/app/api/internal/tasks/submit/route";

describe("internal task submit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the freshly created task snapshot for immediate client-side task list updates", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "user-1", role: "USER" });
    submitNewTaskMock.mockResolvedValue({
      taskId: "task-1",
      taskNo: "PENDING-WB-000002",
      submissionState: "QUEUED",
      message: "任务已进入本地队列，等待派发到算力通道。",
    });
    getTaskByIdMock.mockResolvedValue({
      id: "task-1",
      siteTaskNo: "WB-000002",
      taskNo: "PENDING-WB-000002",
      appCode: "demo-app",
      appName: "Demo App",
      title: "Task 1",
      ownerId: "user-1",
      ownerName: "User One",
      status: "QUEUED",
      providerStatus: "PENDING",
      createdAt: "03/26 00:10",
      createdAtIso: "2026-03-25T16:10:00.000Z",
      queuePosition: 1,
      prompt: "demo prompt",
      params: {},
      resultSummary: "任务排队中...",
      resultItems: [],
      inputAssets: [],
      outputAssets: [],
      systemLogs: [],
      syncLogs: [],
    });

    const response = await POST(
      new Request("http://localhost/api/internal/tasks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appCode: "demo-app",
          formData: { prompt: "demo prompt" },
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.submissionState).toBe("QUEUED");
    expect(data.task?.id).toBe("task-1");
    expect(data.task?.siteTaskNo).toBe("WB-000002");
  });

  it("sanitizes sensitive submission errors before returning them to the client", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "user-1", role: "USER" });
    submitNewTaskMock.mockRejectedValue(
      new Error("Missing RunningHub API key: a5fa88f5502f4fc0820a4e9f0c32855e"),
    );

    const response = await POST(
      new Request("http://localhost/api/internal/tasks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appCode: "demo-app",
          formData: { prompt: "demo prompt" },
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).not.toContain("a5fa88f5502f4fc0820a4e9f0c32855e");
    expect(data.error).toContain("算力通道");
  });
});
