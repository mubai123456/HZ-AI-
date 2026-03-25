import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AdminMaterialsClient } from "@/components/admin-materials-client";
import type { AdminMaterialClaimLogRecord, AdminMaterialItem } from "@/lib/types";

const materials: AdminMaterialItem[] = [
  {
    id: "mat-1",
    title: "春装视频",
    description: "主推素材",
    materialType: "VIDEO",
    materialTypeLabel: "视频",
    status: "AVAILABLE",
    statusLabel: "可领取",
    previewReady: true,
    batchNo: "20260322-A",
    tags: ["春装"],
    sourceFilename: "look-a.mp4",
    fileSizeBytes: 1024,
    durationMs: 5000,
    width: 1080,
    height: 1920,
    createdAt: new Date().toISOString(),
    previewUrl: "/api/internal/materials/mat-1/preview",
    posterUrl: "/api/internal/materials/mat-1/poster",
    downloadUrl: null,
    exclusiveOwnerName: null,
    claimCount: 0,
    activeClaimId: null,
    uploaderName: "管理员",
  },
  {
    id: "mat-2",
    title: "夏装视频",
    description: null,
    materialType: "VIDEO",
    materialTypeLabel: "视频",
    status: "CLAIMED",
    statusLabel: "已领取",
    previewReady: true,
    batchNo: "20260322-B",
    tags: ["夏装"],
    sourceFilename: "look-b.mp4",
    fileSizeBytes: 1024,
    durationMs: 5000,
    width: 1080,
    height: 1920,
    createdAt: new Date().toISOString(),
    previewUrl: "/api/internal/materials/mat-2/preview",
    posterUrl: "/api/internal/materials/mat-2/poster",
    downloadUrl: null,
    exclusiveOwnerName: "用户A",
    claimCount: 1,
    activeClaimId: "claim-1",
    uploaderName: "管理员",
  },
];

const claims: AdminMaterialClaimLogRecord[] = [];

function createFetchMock() {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/internal/admin/material-tags")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: [
            { id: "tag-1", name: "春装", color: null },
            { id: "tag-2", name: "夏装", color: null },
          ],
        }),
      } as Response);
    }

    if (url.includes("/api/internal/admin/materials/bulk")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: [{ materialId: "mat-1", status: "success", message: "updated" }],
          summary: { totalCount: 1, successCount: 1, skippedCount: 0, failureCount: 0 },
        }),
      } as Response);
    }

    if (url.includes("/api/internal/admin/materials") && !url.includes("/bulk")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: materials,
        }),
      } as Response);
    }

    if (url.includes("/api/internal/admin/claims")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: claims,
        }),
      } as Response);
    }

    return Promise.resolve({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);
  });
}

describe("AdminMaterialsClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", createFetchMock());
  });

  it("keeps upload entry visible but hides batch toolbar before selection", async () => {
    render(<AdminMaterialsClient initialMaterials={materials} initialClaims={claims} />);

    expect(await screen.findByRole("button", { name: "批量上传视频" })).toBeInTheDocument();
    expect(screen.queryByTestId("admin-material-bulk-toolbar")).not.toBeInTheDocument();
  });

  it("shows batch toolbar after selecting materials", async () => {
    render(<AdminMaterialsClient initialMaterials={materials} initialClaims={claims} />);

    fireEvent.click(await screen.findByLabelText("选择素材 春装视频"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-material-bulk-toolbar")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "批量改标签" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量下架" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量删除" })).toBeInTheDocument();
  });

  it("opens the upload modal from the toolbar entry", async () => {
    render(<AdminMaterialsClient initialMaterials={materials} initialClaims={claims} />);

    fireEvent.click(await screen.findByRole("button", { name: "批量上传视频" }));

    expect(screen.getByRole("dialog", { name: "批量上传视频" })).toBeInTheDocument();
    expect(screen.getByText("上传设置")).toBeInTheDocument();
    expect(screen.getByText("标签库")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "标签名" })).toBeInTheDocument();
  });

  it("opens the material detail drawer for single-item actions", async () => {
    render(<AdminMaterialsClient initialMaterials={materials} initialClaims={claims} />);

    fireEvent.click(await screen.findByRole("button", { name: "查看 春装视频" }));

    expect(screen.getByRole("dialog", { name: "素材详情：春装视频" })).toBeInTheDocument();
    expect(screen.getByText("主推素材")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存修改" })).toBeInTheDocument();
  });

  it("keeps claims tab in table layout", async () => {
    render(
      <AdminMaterialsClient
        initialMaterials={materials}
        initialClaims={[
          {
            id: "claim-1",
            materialId: "mat-1",
            materialTitle: "春装视频",
            ownerId: "user-1",
            username: "buyer",
            displayName: "买手",
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
            resetReason: null,
          },
        ]}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "领取日志" }));

    expect(screen.getByRole("columnheader", { name: "素材" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "领取人" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "状态" })).toBeInTheDocument();
  });
});
