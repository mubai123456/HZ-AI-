import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecentResultsPanel } from "@/components/recent-results-panel";
import type { TaskRecord } from "@/lib/types";

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-1",
    siteTaskNo: "WB-000001",
    taskNo: "TASK-001",
    appCode: "demo-app",
    appName: "Demo App",
    title: "Task 1",
    ownerId: "user-1",
    ownerName: "User One",
    status: "RUNNING",
    providerStatus: "RUNNING",
    createdAt: "03/22 21:00",
    createdAtIso: "2026-03-22T13:00:00.000Z",
    prompt: "",
    params: {},
    resultSummary: "Task running...",
    resultItems: [],
    inputAssets: [],
    outputAssets: [],
    systemLogs: [],
    syncLogs: [],
    ...overrides,
  };
}

describe("RecentResultsPanel", () => {
  it("renders the user's tasks in newest-first order", () => {
    render(
      <RecentResultsPanel
        tasks={[
          createTask({
            id: "task-1",
            siteTaskNo: "WB-000001",
            taskNo: "TASK-001",
            createdAtIso: "2026-03-22T13:00:00.000Z",
          }),
          createTask({
            id: "task-2",
            siteTaskNo: "WB-000002",
            taskNo: "TASK-002",
            status: "SUCCEEDED",
            providerStatus: "SUCCESS",
            createdAtIso: "2026-03-22T13:05:00.000Z",
            completedAtIso: "2026-03-22T13:06:00.000Z",
          }),
        ]}
        selectedTaskId="task-2"
        onSelectTask={vi.fn()}
      />,
    );

    const cards = screen.getAllByTestId("task-history-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("WB-000002");
    expect(cards[1]).toHaveTextContent("WB-000001");
  });

  it("renders only the compact information rows for each task", () => {
    render(
      <RecentResultsPanel
        tasks={[
          createTask({
            id: "task-2",
            siteTaskNo: "WB-000128",
            taskNo: "PROVIDER-128",
            providerTaskId: "PROVIDER-128",
            status: "SUCCEEDED",
            providerStatus: "SUCCESS",
            appName: "全能图片 2.0",
            resultSummary: "这段摘要不应该继续出现在右栏列表里。",
            createdAtIso: "2026-03-22T13:05:00.000Z",
            completedAtIso: "2026-03-22T13:11:45.000Z",
          }),
        ]}
        selectedTaskId="task-2"
        onSelectTask={vi.fn()}
      />,
    );

    expect(screen.getByText("WB-000128")).toBeInTheDocument();
    expect(screen.getByText("全能图片 2.0")).toBeInTheDocument();
    expect(screen.getByText(/任务ID：/)).toHaveTextContent("PROVIDER-128");
    expect(screen.queryByText("结果:")).not.toBeInTheDocument();
    expect(screen.queryByText("查看结果")).not.toBeInTheDocument();
    expect(screen.queryByText("一键同款")).not.toBeInTheDocument();
    expect(screen.queryByText("这段摘要不应该继续出现在右栏列表里。")).not.toBeInTheDocument();
  });

  it("allows selecting a task by clicking the row", () => {
    const onSelectTask = vi.fn();

    render(
      <RecentResultsPanel
        tasks={[
          createTask({
            id: "task-2",
            siteTaskNo: "WB-000002",
            taskNo: "TASK-002",
            status: "SUCCEEDED",
            providerStatus: "SUCCESS",
            createdAtIso: "2026-03-22T13:05:00.000Z",
            completedAtIso: "2026-03-22T13:06:00.000Z",
          }),
        ]}
        selectedTaskId="task-1"
        onSelectTask={onSelectTask}
      />,
    );

    fireEvent.click(screen.getByTestId("task-history-card"));

    expect(onSelectTask).toHaveBeenCalledWith("task-2");
  });
});
