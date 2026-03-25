import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, getTaskOutputArchiveSourceMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  getTaskOutputArchiveSourceMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/db/tasks", () => ({
  getTaskOutputArchiveSource: getTaskOutputArchiveSourceMock,
}));

describe("GET /api/internal/tasks/[id]/downloads/archive", () => {
  beforeEach(() => {
    vi.resetModules();
    getCurrentSessionMock.mockReset();
    getTaskOutputArchiveSourceMock.mockReset();
  });

  it("returns a zip archive containing all output assets with deduplicated names", async () => {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const path = await import("node:path");

    const outputDir = path.join(process.cwd(), "public", "assets", "task-download-tests");
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "archive-1.png"), "archive-1");
    await writeFile(path.join(outputDir, "archive-2.png"), "archive-2");

    getCurrentSessionMock.mockResolvedValue({ sub: "user-1", role: "USER" });
    getTaskOutputArchiveSourceMock.mockResolvedValue({
      taskId: "task-1",
      siteTaskNo: "WB-000001",
      taskNo: "TASK-001",
      assets: [
        {
          id: "asset-1",
          name: "result.png",
          mimeType: "image/png",
          url: "/assets/task-download-tests/archive-1.png",
          storageKey: null,
        },
        {
          id: "asset-2",
          name: "result.png",
          mimeType: "image/png",
          url: "/assets/task-download-tests/archive-2.png",
          storageKey: null,
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/internal/tasks/task-1/downloads/archive"), {
      params: Promise.resolve({ id: "task-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain("WB-000001-outputs.zip");

    const bodyText = Buffer.from(await response.arrayBuffer()).toString("latin1");
    expect(bodyText).toContain("result.png");
    expect(bodyText).toContain("result-2.png");
  });

  it("returns 400 when the task has no output assets", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "user-1", role: "USER" });
    getTaskOutputArchiveSourceMock.mockResolvedValue({
      taskId: "task-1",
      siteTaskNo: "WB-000001",
      taskNo: "TASK-001",
      assets: [],
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/internal/tasks/task-1/downloads/archive"), {
      params: Promise.resolve({ id: "task-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("archives remote provider assets when outputs are not mirrored into object storage", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("remote-archive", {
        status: 200,
        headers: {
          "content-type": "image/png",
        },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    getCurrentSessionMock.mockResolvedValue({ sub: "user-1", role: "USER" });
    getTaskOutputArchiveSourceMock.mockResolvedValue({
      taskId: "task-1",
      siteTaskNo: "WB-000002",
      taskNo: "TASK-002",
      assets: [
        {
          id: "asset-1",
          name: "remote.png",
          mimeType: "image/png",
          url: "https://provider.example.com/archive.png",
          storageKey: null,
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/internal/tasks/task-1/downloads/archive"), {
      params: Promise.resolve({ id: "task-1" }),
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("https://provider.example.com/archive.png");
    expect(response.headers.get("content-type")).toBe("application/zip");
    vi.unstubAllGlobals();
  });
});
