import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  taskCountMock,
  taskFindManyMock,
  userCountMock,
  materialCountMock,
  materialClaimCountMock,
  appFindFirstMock,
} = vi.hoisted(() => ({
  taskCountMock: vi.fn(),
  taskFindManyMock: vi.fn(),
  userCountMock: vi.fn(),
  materialCountMock: vi.fn(),
  materialClaimCountMock: vi.fn(),
  appFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      count: taskCountMock,
      findMany: taskFindManyMock,
    },
    user: {
      count: userCountMock,
    },
    material: {
      count: materialCountMock,
    },
    materialClaim: {
      count: materialClaimCountMock,
    },
    app: {
      findFirst: appFindFirstMock,
    },
  },
}));

import { getAdminOverview } from "@/lib/db/admin";

describe("getAdminOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    taskCountMock.mockResolvedValue(0);
    taskFindManyMock.mockResolvedValue([]);
    userCountMock.mockResolvedValue(0);
    materialCountMock.mockResolvedValue(0);
    materialClaimCountMock.mockResolvedValue(0);
    appFindFirstMock.mockResolvedValue(null);
  });

  it("returns an empty overview instead of throwing when overview queries fail", async () => {
    materialClaimCountMock.mockRejectedValueOnce(new Error("invalid input value for enum ClaimStatus"));

    const overview = await getAdminOverview();

    expect(overview.metrics).toEqual([
      { label: "今日任务", value: "0" },
      { label: "运行中", value: "0" },
      { label: "排队中", value: "0" },
      { label: "失败率", value: "0%" },
      { label: "活跃用户", value: "0" },
      { label: "公海素材", value: "0" },
      { label: "已认领", value: "0" },
      { label: "今日回收", value: "0" },
    ]);
    expect(overview.managementLinks.some((link) => link.href === "/admin/apps")).toBe(true);
    expect(overview.appHealth).toEqual({
      appName: "-",
      successRate: 0,
      todayCalls: 0,
      avgDuration: "0s",
      queuePeak: 0,
    });
  });
});
