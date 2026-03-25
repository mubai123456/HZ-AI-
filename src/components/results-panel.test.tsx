import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResultsPanel } from "@/components/results-panel";
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
    status: "SUCCEEDED",
    providerStatus: "SUCCESS",
    createdAt: "03/22 21:00",
    createdAtIso: "2026-03-22T13:00:00.000Z",
    completedAt: "03/22 21:01",
    completedAtIso: "2026-03-22T13:01:00.000Z",
    prompt: "Generate a detailed product hero shot with fabric texture preserved.",
    params: {
      ratio: "1:1",
      style: "realistic",
      image1: "https://example.com/reference-1.png",
      image2: "https://example.com/reference-2.png",
    },
    resultSummary: "Task completed.",
    resultItems: [],
    inputAssets: [
      {
        id: "input-1",
        kind: "INPUT",
        name: "Reference 1",
        url: "https://example.com/reference-1.png",
      },
      {
        id: "input-2",
        kind: "INPUT",
        name: "Reference 2",
        url: "https://example.com/reference-2.png",
      },
    ],
    outputAssets: [
      {
        id: "asset-1",
        kind: "OUTPUT",
        name: "Result",
        url: "https://example.com/result.png",
      },
    ],
    systemLogs: [],
    syncLogs: [],
    ...overrides,
  };
}

describe("ResultsPanel", () => {
  it("does not render the removed input summary block", () => {
    render(<ResultsPanel task={createTask()} onPoll={vi.fn()} />);

    expect(screen.queryByLabelText("toggle-input-summary")).not.toBeInTheDocument();
    expect(screen.queryByText("输入摘要")).not.toBeInTheDocument();
    expect(screen.queryByText("Prompt 预览")).not.toBeInTheDocument();
    expect(screen.queryByText("创作 Prompt")).not.toBeInTheDocument();
  });

  it("renders output actions with the new current download button", () => {
    render(
      <ResultsPanel
        task={createTask()}
        onPoll={vi.fn()}
        leadingContent={<div data-testid="leading-case-panel">案例内容</div>}
      />,
    );

    expect(screen.getByText("结果区")).toBeInTheDocument();
    expect(screen.getByText("当前任务结果")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "结果" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "案例" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("button", { name: "下载当前图片" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "查看当前图片" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "复制任务 ID" })).toBeInTheDocument();
    expect(screen.getAllByText("任务 ID：TASK-001")).toHaveLength(2);
    expect(screen.getByText("参考图")).toBeInTheDocument();
    expect(screen.queryByText("https://example.com/reference-1.png")).not.toBeInTheDocument();
    expect(screen.queryByText("https://example.com/reference-2.png")).not.toBeInTheDocument();
  });

  it("renders all output images as a gallery and switches the active image", () => {
    render(
      <ResultsPanel
        task={createTask({
          outputAssets: [
            {
              id: "asset-1",
              kind: "OUTPUT",
              name: "Result 1",
              url: "https://example.com/result-1.png",
            },
            {
              id: "asset-2",
              kind: "OUTPUT",
              name: "Result 2",
              url: "/assets/task-1/result-2.png",
            },
          ],
        })}
        onPoll={vi.fn()}
      />,
    );

    expect(screen.getByText("结果 1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "直接下载多张" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载全部 ZIP" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Result 2" })).toHaveAttribute("src", "/assets/task-1/result-2.png");

    fireEvent.click(screen.getByRole("button", { name: "查看结果 2" }));

    expect(screen.getByText("结果 2 / 2")).toBeInTheDocument();
  });

  it("switches between result and case tabs inside the unified result area", () => {
    render(
      <ResultsPanel
        task={createTask()}
        onPoll={vi.fn()}
        leadingContent={<div data-testid="leading-case-panel">案例内容</div>}
      />,
    );

    expect(screen.queryByTestId("leading-case-panel")).not.toBeInTheDocument();
    expect(screen.getByText("当前任务结果")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "案例" }));

    expect(screen.getByRole("tab", { name: "案例" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("leading-case-panel")).toBeInTheDocument();
    expect(screen.getByText("案例内容")).toBeInTheDocument();
    expect(screen.queryByText("当前任务结果")).not.toBeInTheDocument();
  });

  it("keeps the case tab available even before a task is selected", () => {
    render(
      <ResultsPanel
        task={null}
        onPoll={vi.fn()}
        leadingContent={<div data-testid="leading-case-panel">案例内容</div>}
      />,
    );

    expect(screen.getByRole("tab", { name: "结果" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByTestId("leading-case-panel")).not.toBeInTheDocument();
    expect(screen.getByText("结果区")).toBeInTheDocument();
    expect(screen.getByText("先在左侧填写参考图、Prompt 和关键参数，提交后这里会自动显示最新任务结果。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "案例" }));

    expect(screen.getByRole("tab", { name: "案例" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("leading-case-panel")).toBeInTheDocument();
  });
});
