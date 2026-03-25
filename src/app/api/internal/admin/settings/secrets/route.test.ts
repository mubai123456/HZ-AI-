import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, getSecretStatusItemsMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  getSecretStatusItemsMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/settings", () => ({
  getSecretStatusItems: getSecretStatusItemsMock,
}));

import { GET } from "@/app/api/internal/admin/settings/secrets/route";

describe("admin secrets settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns secret status items for admins", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    getSecretStatusItemsMock.mockResolvedValue([
      {
        envKey: "RUNNINGHUB_API_KEY",
        label: "RunningHub API Key",
        configured: true,
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].envKey).toBe("RUNNINGHUB_API_KEY");
  });
});
