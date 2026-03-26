import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, uploadFileMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  uploadFileMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/runninghub", () => ({
  uploadFile: uploadFileMock,
}));

import { POST } from "@/app/api/internal/upload/route";

describe("internal upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sanitizes sensitive RunningHub credential errors before returning them to the client", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "user-1", role: "USER" });
    uploadFileMock.mockRejectedValue(
      new Error("Missing RunningHub API key: a5fa88f5502f4fc0820a4e9f0c32855e"),
    );

    const formData = new FormData();
    formData.append("file", new Blob(["demo"], { type: "image/png" }), "demo.png");

    const response = await POST({
      formData: async () => formData,
    } as Request);

    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).not.toContain("a5fa88f5502f4fc0820a4e9f0c32855e");
    expect(data.error).toBe("RunningHub 通道未配置完成，请联系管理员检查集成设置。");
  });
});
