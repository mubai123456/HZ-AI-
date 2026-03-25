import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, getTaskOutputAssetDownloadSourceMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  getTaskOutputAssetDownloadSourceMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/db/tasks", () => ({
  getTaskOutputAssetDownloadSource: getTaskOutputAssetDownloadSourceMock,
}));

describe("GET /api/internal/tasks/[id]/downloads/assets/[assetId]", () => {
  beforeEach(() => {
    vi.resetModules();
    getCurrentSessionMock.mockReset();
    getTaskOutputAssetDownloadSourceMock.mockReset();
  });

  it("streams the current output asset as an attachment", async () => {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const path = await import("node:path");

    const outputDir = path.join(process.cwd(), "public", "assets", "task-download-tests");
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "result-1.png"), "result-1");

    getCurrentSessionMock.mockResolvedValue({ sub: "user-1", role: "USER" });
    getTaskOutputAssetDownloadSourceMock.mockResolvedValue({
      taskId: "task-1",
      siteTaskNo: "WB-000001",
      taskNo: "TASK-001",
      asset: {
        id: "asset-1",
        name: "result-1.png",
        mimeType: "image/png",
        url: "/assets/task-download-tests/result-1.png",
        storageKey: null,
      },
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/internal/tasks/task-1/downloads/assets/asset-1"), {
      params: Promise.resolve({ id: "task-1", assetId: "asset-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment;");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(await response.text()).toBe("result-1");
  });

  it("returns 404 when the viewer cannot access the asset", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "user-1", role: "USER" });
    getTaskOutputAssetDownloadSourceMock.mockResolvedValue(null);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/internal/tasks/task-1/downloads/assets/asset-1"), {
      params: Promise.resolve({ id: "task-1", assetId: "asset-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("proxies remote provider assets when they are not stored locally", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("remote-result", {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": "13",
        },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    getCurrentSessionMock.mockResolvedValue({ sub: "user-1", role: "USER" });
    getTaskOutputAssetDownloadSourceMock.mockResolvedValue({
      taskId: "task-1",
      siteTaskNo: "WB-000001",
      taskNo: "TASK-001",
      asset: {
        id: "asset-1",
        name: "remote-result.png",
        mimeType: "image/png",
        url: "https://provider.example.com/result.png",
        storageKey: null,
      },
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/internal/tasks/task-1/downloads/assets/asset-1"), {
      params: Promise.resolve({ id: "task-1", assetId: "asset-1" }),
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("https://provider.example.com/result.png");
    expect(await response.text()).toBe("remote-result");
    vi.unstubAllGlobals();
  });
});
