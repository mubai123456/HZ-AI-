import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, getResolvedSiteSettingsMock, saveSiteSettingsMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  getResolvedSiteSettingsMock: vi.fn(),
  saveSiteSettingsMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/settings", () => ({
  getResolvedSiteSettings: getResolvedSiteSettingsMock,
  saveSiteSettings: saveSiteSettingsMock,
  siteSettingsUpdateSchema: {
    parse: (input: unknown) => input,
  },
}));

import { GET, PUT } from "@/app/api/internal/admin/settings/site/route";

describe("admin site settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns resolved site settings for admins", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    getResolvedSiteSettingsMock.mockResolvedValue({
      siteName: "AI Workbench",
      siteDescription: "demo",
      workspaceLabel: "Team Workspace",
      adminWorkspaceLabel: "Admin Workspace",
      themeColor: "#0066DD",
      navLabels: { home: "工作台" },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.siteName).toBe("AI Workbench");
  });

  it("persists site settings through the shared save helper", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    saveSiteSettingsMock.mockResolvedValue(undefined);
    getResolvedSiteSettingsMock.mockResolvedValue({
      siteName: "New Name",
      siteDescription: "new desc",
      workspaceLabel: "Team",
      adminWorkspaceLabel: "Admin",
      themeColor: "#123456",
      navLabels: { home: "首页" },
    });

    const response = await PUT(
      new Request("http://localhost/api/internal/admin/settings/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: "New Name",
          siteDescription: "new desc",
          workspaceLabel: "Team",
          adminWorkspaceLabel: "Admin",
          themeColor: "#123456",
          navLabels: { home: "首页" },
        }),
      }),
    );
    const data = await response.json();

    expect(saveSiteSettingsMock).toHaveBeenCalledWith({
      siteName: "New Name",
      siteDescription: "new desc",
      workspaceLabel: "Team",
      adminWorkspaceLabel: "Admin",
      themeColor: "#123456",
      navLabels: { home: "首页" },
    });
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});
