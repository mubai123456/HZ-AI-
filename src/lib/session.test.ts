import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, verifySessionTokenMock, findUniqueMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  verifySessionTokenMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/auth", () => ({
  SESSION_COOKIE_NAME: "ai-workbench-session",
  verifySessionToken: verifySessionTokenMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
    },
  },
}));

import { getCurrentSession } from "@/lib/session";

describe("getCurrentSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the session cookie is missing", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    await expect(getCurrentSession()).resolves.toBeNull();
    expect(verifySessionTokenMock).not.toHaveBeenCalled();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns null when the token is valid but the user no longer exists", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token-1" }),
    });
    verifySessionTokenMock.mockResolvedValue({
      sub: "stale-user-id",
      username: "admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    findUniqueMock.mockResolvedValue(null);

    await expect(getCurrentSession()).resolves.toBeNull();
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "stale-user-id" },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        active: true,
        deletedAt: true,
      },
    });
  });

  it("returns the session when the token resolves to an active user", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token-2" }),
    });
    verifySessionTokenMock.mockResolvedValue({
      sub: "user-1",
      username: "admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      username: "admin",
      displayName: "管理员",
      role: "ADMIN",
      active: true,
      deletedAt: null,
    });

    await expect(getCurrentSession()).resolves.toEqual({
      sub: "user-1",
      username: "admin",
      displayName: "管理员",
      role: "ADMIN",
    });
  });
});
