import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppWorkbenchClient } from "@/components/app-workbench-client";
import type { AppDefinition, TaskRecord, TaskSubmissionResult } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock("@/components/workbench-header-slot", () => ({
  WorkbenchHeaderSlot: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/app-showcase-gallery", () => ({
  AppShowcaseGallery: () => <div data-testid="showcase-gallery" />,
}));

vi.mock("@/components/workbench-layout", () => ({
  WorkbenchLayout: ({
    left,
    middle,
    right,
  }: {
    left: React.ReactNode;
    middle: React.ReactNode;
    right: React.ReactNode;
  }) => (
    <div>
      <div data-testid="left-slot">{left}</div>
      <div data-testid="middle-slot">{middle}</div>
      <div data-testid="right-slot">{right}</div>
    </div>
  ),
}));

vi.mock("@/components/left-panel", () => ({
  LeftPanel: ({
    onTaskSubmitted,
  }: {
    onTaskSubmitted?: (result: TaskSubmissionResult) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onTaskSubmitted?.({
          taskId: "task-2",
          taskNo: "PENDING-WB-000002",
          submissionState: "QUEUED",
          message: "任务已进入本地队列，等待派发到 RunningHub。",
          task: createTask({
            id: "task-2",
            siteTaskNo: "WB-000002",
            taskNo: "PENDING-WB-000002",
            status: "QUEUED",
            providerStatus: "PENDING",
            createdAtIso: "2026-03-25T16:10:00.000Z",
          }),
        })
      }
    >
      提交新任务
    </button>
  ),
}));

vi.mock("@/components/results-panel-client", () => ({
  ResultsPanelClient: ({ task }: { task: TaskRecord | null }) => (
    <div data-testid="selected-task">{task?.siteTaskNo ?? "empty"}</div>
  ),
}));

function createApp(): AppDefinition {
  return {
    id: "app-1",
    code: "demo-app",
    name: "Demo App",
    description: "",
    provider: "RUNNINGHUB",
    providerAppId: "demo-app",
    enabled: true,
    shareResults: false,
    statusLabel: "Enabled",
    outputType: "IMAGE",
    syncTarget: "RESULT_ARCHIVE",
    category: "",
    formSchemaJson: [],
    requestMappingJson: {},
    defaultParamsJson: {},
    syncMappingJson: {},
    tags: [],
    showcaseImages: [],
    estimatedPriceFen: 0,
    estimatedPriceLabel: "¥0.00",
  };
}

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
    status: "SUCCEEDED",
    providerStatus: "SUCCESS",
    createdAt: "03/26 00:00",
    createdAtIso: "2026-03-25T16:00:00.000Z",
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

describe("AppWorkbenchClient", () => {
  it("shows the newly submitted task immediately even before SSE refresh arrives", () => {
    render(<AppWorkbenchClient app={createApp()} allTasks={[createTask()]} />);

    expect(screen.getByTestId("selected-task")).toHaveTextContent("WB-000001");

    fireEvent.click(screen.getByRole("button", { name: "提交新任务" }));

    expect(screen.getByTestId("selected-task")).toHaveTextContent("WB-000002");
    expect(screen.getAllByText("WB-000002").length).toBeGreaterThan(0);
  });
});
