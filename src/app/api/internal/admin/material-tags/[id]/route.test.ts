import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, updateMaterialTagMock, deleteMaterialTagMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  updateMaterialTagMock: vi.fn(),
  deleteMaterialTagMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/db/materials", () => ({
  updateMaterialTag: updateMaterialTagMock,
  deleteMaterialTag: deleteMaterialTagMock,
}));

import { DELETE, PATCH } from "@/app/api/internal/admin/material-tags/[id]/route";

describe("admin material tag detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a material tag name", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    updateMaterialTagMock.mockResolvedValue({
      id: "tag-1",
      name: "春季穿搭",
      color: null,
    });

    const response = await PATCH(
      new Request("http://localhost/api/internal/admin/material-tags/tag-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "春季穿搭" }),
      }),
      { params: Promise.resolve({ id: "tag-1" }) },
    );
    const data = await response.json();

    expect(updateMaterialTagMock).toHaveBeenCalledWith({
      tagId: "tag-1",
      name: "春季穿搭",
    });
    expect(response.status).toBe(200);
    expect(data.item.name).toBe("春季穿搭");
  });

  it("deletes a material tag without deleting materials", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    deleteMaterialTagMock.mockResolvedValue({ ok: true });

    const response = await DELETE(new Request("http://localhost/api/internal/admin/material-tags/tag-1"), {
      params: Promise.resolve({ id: "tag-1" }),
    });
    const data = await response.json();

    expect(deleteMaterialTagMock).toHaveBeenCalledWith({
      tagId: "tag-1",
    });
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});
