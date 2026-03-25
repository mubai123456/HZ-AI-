import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkbenchLayout } from "@/components/workbench-layout";

describe("WorkbenchLayout", () => {
  it("renders the three panels without the legacy collapse controls", () => {
    render(
      <WorkbenchLayout
        left={<div>Left Panel</div>}
        middle={<div>Middle Panel</div>}
        right={<div>Right Panel</div>}
      />,
    );

    expect(screen.getByText("Left Panel")).toBeInTheDocument();
    expect(screen.getByText("Middle Panel")).toBeInTheDocument();
    expect(screen.getByText("Right Panel")).toBeInTheDocument();
    expect(screen.queryByLabelText("open-input-panel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("collapse-input-panel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("open-latest-task-panel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("collapse-latest-task-panel")).not.toBeInTheDocument();
  });

  it("supports collapsing the right panel on desktop without removing the middle panel", () => {
    render(
      <WorkbenchLayout
        left={<div>Left Panel</div>}
        middle={<div>Middle Panel</div>}
        right={<div>Right Panel</div>}
        rightPanelToggle={{
          panelName: "全站任务",
          defaultOpen: false,
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "展开全站任务" })).toBeInTheDocument();
    expect(screen.getByTestId("workbench-right-panel")).toHaveClass("xl:w-0");
    expect(screen.getByText("Middle Panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "展开全站任务" }));

    expect(screen.getByRole("button", { name: "收起全站任务" })).toBeInTheDocument();
    expect(screen.getByTestId("workbench-right-panel")).toHaveClass("xl:w-[360px]");
  });
});
