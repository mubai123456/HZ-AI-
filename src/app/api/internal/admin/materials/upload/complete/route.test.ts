import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentSessionMock,
  analyzeUploadedMaterialFileMock,
  findMaterialByChecksumMock,
  storeMaterialFileMock,
  createMaterialEntryMock,
} = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  analyzeUploadedMaterialFileMock: vi.fn(),
  findMaterialByChecksumMock: vi.fn(),
  storeMaterialFileMock: vi.fn(),
  createMaterialEntryMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/material-storage", () => ({
  analyzeUploadedMaterialFile: analyzeUploadedMaterialFileMock,
  storeMaterialFile: storeMaterialFileMock,
}));

vi.mock("@/lib/db/materials", () => ({
  createMaterialEntry: createMaterialEntryMock,
  findMaterialByChecksum: findMaterialByChecksumMock,
}));

import { POST } from "@/app/api/internal/admin/materials/upload/complete/route";

describe("admin material upload complete route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a single file upload payload and returns a single-file result", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN", displayName: "管理员" });
    analyzeUploadedMaterialFileMock.mockResolvedValue({
      bytes: Buffer.from("video"),
      checksumSha256: "sha-1",
      fileSizeBytes: 5,
      mimeType: "video/mp4",
      safeFilename: "look.mp4",
    });
    findMaterialByChecksumMock.mockResolvedValue(null);
    storeMaterialFileMock.mockResolvedValue({
      bucket: "local-private",
      objectKey: "materials/original/look.mp4",
    });
    createMaterialEntryMock.mockResolvedValue({
      id: "mat-1",
      title: "春装视频",
      description: "批量上传说明",
      materialType: "VIDEO",
      materialTypeLabel: "视频",
      status: "AVAILABLE",
      statusLabel: "可领取",
      previewReady: true,
      batchNo: "20260322-A",
      tags: ["春装", "短视频"],
      sourceFilename: "look.mp4",
      fileSizeBytes: 5,
      durationMs: 5000,
      width: 1080,
      height: 1920,
      createdAt: new Date().toISOString(),
      previewUrl: "/api/internal/materials/mat-1/preview",
      posterUrl: "/api/internal/materials/mat-1/preview",
      downloadUrl: null,
    });

    const formData = new FormData();
    formData.set("file", new File(["video"], "look.mp4", { type: "video/mp4" }));
    formData.set("batchNo", "20260322-A");
    formData.set("description", "批量上传说明");
    formData.set("selectedTags", JSON.stringify(["春装", "短视频"]));
    formData.set(
      "metadata",
      JSON.stringify([
        {
          name: "look.mp4",
          title: "春装视频",
          width: 1080,
          height: 1920,
          durationMs: 5000,
          previewSupported: true,
        },
      ]),
    );

    const request = new Request("http://localhost/api/internal/admin/materials/upload/complete", {
      method: "POST",
    });
    vi.spyOn(request, "formData").mockResolvedValue(formData);

    const response = await POST(request);
    const data = await response.json();

    expect(createMaterialEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "春装视频",
        batchNo: "20260322-A",
        description: "批量上传说明",
        sourceFilename: "look.mp4",
        tags: ["春装", "短视频"],
        createdById: "admin-1",
      }),
    );
    expect(response.status).toBe(201);
    expect(data.results).toHaveLength(1);
    expect(data.results[0]?.status).toBe("created");
  });
});
