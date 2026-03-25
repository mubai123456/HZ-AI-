import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentSessionMock,
  findUniqueMock,
  createMock,
} = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    app: {
      findUnique: findUniqueMock,
      create: createMock,
    },
  },
}));

import { POST } from "@/app/api/internal/admin/apps/route";

describe("admin apps route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores showcase images during app creation", async () => {
    getCurrentSessionMock.mockResolvedValue({ sub: "admin-1", role: "ADMIN" });
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: "app-1",
      code: "showcase-demo",
      tags: [],
    });

    const response = await POST(
      new Request("http://localhost/api/internal/admin/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "showcase-demo",
          name: "Showcase Demo",
          providerAppId: "provider-1",
          estimatedPriceYuan: "0",
          showcaseImages: [
            "https://example.com/showcase-1.png",
            "https://example.com/showcase-2.png",
          ],
        }),
      }),
    );

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          showcaseImagesJson: [
            "https://example.com/showcase-1.png",
            "https://example.com/showcase-2.png",
          ],
        }),
      }),
    );
    expect(response.status).toBe(201);
  });
});
