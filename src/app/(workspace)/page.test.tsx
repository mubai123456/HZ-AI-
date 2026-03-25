import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, getDashboardSummaryMock, getEnabledAppsWithStatsMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  getDashboardSummaryMock: vi.fn(),
  getEnabledAppsWithStatsMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/db/tasks", () => ({
  getDashboardSummary: getDashboardSummaryMock,
}));

vi.mock("@/lib/db/apps", () => ({
  getEnabledAppsWithStats: getEnabledAppsWithStatsMock,
}));

vi.mock("@/components/page-header", () => ({
  PageHeader: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock("@/components/stat-card", () => ({
  StatCard: ({ label, value, trend }: { label: string; value: string; trend: string }) => (
    <div>{`${label}:${value}:${trend}`}</div>
  ),
}));

vi.mock("@/components/surface-card", () => ({
  SurfaceCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock("@/components/app-card-horizontal", () => ({
  AppCardHorizontal: ({ app, runCount }: { app: { name: string }; runCount: number }) => (
    <div>{`${app.name}:${runCount}`}</div>
  ),
}));

vi.mock("@/components/status-badge", () => ({
  StatusBadge: ({ value }: { value: string }) => <span>{value}</span>,
}));

import DashboardPage from "@/app/(workspace)/page";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentSessionMock.mockResolvedValue({
      sub: "user-admin",
      role: "ADMIN",
    });
  });

  it("renders the fallback dashboard when summary and app queries fail", async () => {
    getDashboardSummaryMock.mockRejectedValue(new Error("summary exploded"));
    getEnabledAppsWithStatsMock.mockRejectedValue(new Error("apps exploded"));

    render(await DashboardPage());

    expect(screen.getByText("AI 应用工作台")).toBeInTheDocument();
    expect(screen.getByText("同步异常:0:正常")).toBeInTheDocument();
    expect(screen.getByText("当前没有待处理异常")).toBeInTheDocument();
  });
});
