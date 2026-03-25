import { render, screen } from "@testing-library/react";

import WorkspaceError from "@/app/(workspace)/error";

describe("WorkspaceError", () => {
  it("shows the digest when production server errors provide one", () => {
    render(
      <WorkspaceError
        error={Object.assign(new Error("页面出错"), { digest: "digest-123" })}
        reset={vi.fn()}
      />,
    );

    expect(screen.getByText("错误编号：digest-123")).toBeInTheDocument();
  });

  it("hides the digest block when no digest is available", () => {
    render(<WorkspaceError error={new Error("页面出错")} reset={vi.fn()} />);

    expect(screen.queryByText(/错误编号：/)).not.toBeInTheDocument();
  });
});
