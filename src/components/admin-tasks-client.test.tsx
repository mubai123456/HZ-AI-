import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminTasksClient } from "@/components/admin-tasks-client";
import type { TaskRecord } from "@/lib/types";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-1",
    siteTaskNo: "WB-000001",
    taskNo: "TASK-001",
    appCode: "demo-app",
    appName: "全能图片 2.0",
    title: "Task 1",
    ownerId: "user-1",
    ownerName: "朝鑫",
    status: "SUCCEEDED",
    providerStatus: "SUCCESS",
    syncStatus: "FAILED",
    createdAt: "03/22 21:37",
    createdAtIso: "2026-03-22T13:37:00.000Z",
    prompt: "",
    params: {},
    resultSummary: "任务已完成",
    resultItems: [],
    inputAssets: [],
    outputAssets: [],
    systemLogs: [],
    syncLogs: [],
    ...overrides,
  };
}

describe("AdminTasksClient", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("renders input preview and task id columns", () => {
    render(<AdminTasksClient initialTasks={[createTask()]} />);

    expect(screen.getByText("输入参考图")).toBeInTheDocument();
    expect(screen.getByText("WB-000001")).toBeInTheDocument();
    expect(screen.getByText("任务ID：TASK-001")).toBeInTheDocument();
  });

  it("shows an input preview and opens lightbox for reference images", () => {
    render(
      <AdminTasksClient
        initialTasks={[
          createTask({
            inputAssets: [
              {
                id: "input-1",
                kind: "INPUT",
                name: "参考图 1",
                url: "/assets/task-1/input-1.png",
                sourceSlot: "reference_image",
              },
            ],
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "预览任务 WB-000001 输入参考图" }));

    expect(screen.getAllByAltText("参考图 1")).toHaveLength(2);
  });

  it("shows a result preview and opens lightbox for tasks with outputs", () => {
    render(
      <AdminTasksClient
        initialTasks={[
          createTask({
            outputAssets: [
              {
                id: "asset-1",
                kind: "OUTPUT",
                name: "结果图 1",
                url: "/assets/task-1/result-1.png",
              },
            ],
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "预览任务 WB-000001 结果" }));

    expect(screen.getAllByAltText("结果图 1")).toHaveLength(2);
    expect(screen.getByTitle("重置")).toBeInTheDocument();
  });

  it("opens a task detail drawer with mapped input labels", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...createTask({
            prompt: "样式化主提示词",
            params: {
              prompt: "样式化主提示词",
              style: "vintage",
            },
            inputAssets: [
              {
                id: "input-1",
                kind: "INPUT",
                name: "主参考图",
                url: "/assets/task-1/input-1.png",
                sourceSlot: "reference_image",
              },
            ],
            outputAssets: [
              {
                id: "asset-1",
                kind: "OUTPUT",
                name: "结果图 1",
                url: "/assets/task-1/result-1.png",
              },
            ],
            systemLogs: ["provider-task-1", "SUCCESS"],
            syncLogs: [{ time: "20:32:18", message: "已同步到飞书", status: "SUCCESS" }],
          }),
          appInputSchema: [
            { key: "reference_image", label: "参考图", type: "image", hidden: false },
            { key: "prompt", label: "创作 Prompt", type: "textarea", hidden: false },
            { key: "style", label: "风格", type: "select", hidden: false },
          ],
        }),
        { status: 200 },
      ),
    );

    render(<AdminTasksClient initialTasks={[createTask()]} />);

    fireEvent.click(screen.getByRole("button", { name: "打开任务 WB-000001 详情" }));

    expect(await screen.findByRole("dialog", { name: "任务详情：WB-000001" })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith("/api/internal/tasks/task-1", { cache: "no-store" });
    expect(screen.getByText("创作 Prompt")).toBeInTheDocument();
    expect(screen.getByText("样式化主提示词")).toBeInTheDocument();
    expect(screen.getByText("风格")).toBeInTheDocument();
    expect(screen.getByText("vintage")).toBeInTheDocument();
    expect(screen.getByText("系统日志")).toBeInTheDocument();
    expect(screen.getByText("飞书同步")).toBeInTheDocument();
  });

  it("submits bulk sync retries for selected tasks", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [{ id: "task-1", status: "success", message: "同步成功" }],
          summary: { totalCount: 1, successCount: 1, skippedCount: 0, failureCount: 0 },
        }),
        { status: 200 },
      ),
    );

    render(<AdminTasksClient initialTasks={[createTask()]} />);

    fireEvent.click(screen.getByLabelText("勾选任务 WB-000001"));
    fireEvent.click(screen.getByRole("button", { name: "批量重试同步" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/internal/admin/tasks/bulk",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("removes deleted tasks from the list after bulk delete succeeds", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [{ id: "task-1", status: "success", message: "已删除" }],
          summary: { totalCount: 1, successCount: 1, skippedCount: 0, failureCount: 0 },
        }),
        { status: 200 },
      ),
    );

    render(<AdminTasksClient initialTasks={[createTask()]} />);

    fireEvent.click(screen.getByLabelText("勾选任务 WB-000001"));
    fireEvent.click(screen.getByRole("button", { name: "批量删除" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(screen.queryByText("WB-000001")).not.toBeInTheDocument());
  });
});
