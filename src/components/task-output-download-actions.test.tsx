import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskOutputDownloadActions } from "@/components/task-output-download-actions";
import type { TaskAssetRecord } from "@/lib/types";

const fetchMock = vi.fn();
const createObjectUrlMock = vi.fn();
const revokeObjectUrlMock = vi.fn();
const anchorClickMock = vi.fn();

function createAssets(): TaskAssetRecord[] {
  return [
    { id: "asset-1", kind: "OUTPUT", name: "result-1.png", url: "/assets/result-1.png" },
    { id: "asset-2", kind: "OUTPUT", name: "result-2.png", url: "/assets/result-2.png" },
  ];
}

describe("TaskOutputDownloadActions", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    createObjectUrlMock.mockReset();
    revokeObjectUrlMock.mockReset();
    anchorClickMock.mockReset();

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", {
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: revokeObjectUrlMock,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(anchorClickMock);

    createObjectUrlMock.mockReturnValue("blob:download");
  });

  it("shows bulk download buttons when multiple outputs are present", () => {
    render(<TaskOutputDownloadActions taskId="task-1" assets={createAssets()} currentAssetId="asset-1" />);

    expect(screen.getByRole("button", { name: "下载当前图片" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "直接下载多张" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载全部 ZIP" })).toBeInTheDocument();
  });

  it("downloads all assets sequentially", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response("asset-1", {
          status: 200,
          headers: { "content-disposition": 'attachment; filename="result-1.png"' },
        }),
      )
      .mockResolvedValueOnce(
        new Response("asset-2", {
          status: 200,
          headers: { "content-disposition": 'attachment; filename="result-2.png"' },
        }),
      );

    render(<TaskOutputDownloadActions taskId="task-1" assets={createAssets()} currentAssetId="asset-1" />);

    fireEvent.click(screen.getByRole("button", { name: "直接下载多张" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/internal/tasks/task-1/downloads/assets/asset-1");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/internal/tasks/task-1/downloads/assets/asset-2");
    expect(anchorClickMock).toHaveBeenCalledTimes(2);
  });

  it("shows a non-blocking error when one of the downloads fails", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response("asset-1", {
          status: 200,
          headers: { "content-disposition": 'attachment; filename="result-1.png"' },
        }),
      )
      .mockResolvedValueOnce(new Response("failed", { status: 500 }));

    render(<TaskOutputDownloadActions taskId="task-1" assets={createAssets()} currentAssetId="asset-1" />);

    fireEvent.click(screen.getByRole("button", { name: "直接下载多张" }));

    await waitFor(() => {
      expect(screen.getByText("有 1 张图片下载失败，建议改用 ZIP 下载。")).toBeInTheDocument();
    });
  });
});
