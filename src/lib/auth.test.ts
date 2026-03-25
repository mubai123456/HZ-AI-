import { beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authenticateMockUser } from "@/lib/auth";

const testUsername = "auth-test-admin";

describe("authenticateMockUser", () => {
  beforeAll(async () => {
    // Set up test user with password hash
    const passwordHash = await bcrypt.hash("workbench123", 10);
    await prisma.user.upsert({
      where: { username: testUsername },
      update: { passwordHash },
      create: {
        username: testUsername,
        displayName: "Test Admin",
        role: "ADMIN",
        active: true,
        passwordHash,
      },
    });
  });

  it("accepts a known mock user with correct password", async () => {
    const result = await authenticateMockUser(testUsername, "workbench123");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.username).toBe(testUsername);
      expect(result.user.role).toBe("ADMIN");
    }
  });

  it("rejects incorrect password", async () => {
    const result = await authenticateMockUser(testUsername, "wrongpassword");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("密码错误。");
    }
  });

  it("rejects unknown usernames", async () => {
    const result = await authenticateMockUser("missing-user", "workbench123");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("账号不存在或未启用。");
    }
  });

  it("rejects very short passwords", async () => {
    const result = await authenticateMockUser(testUsername, "123");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("请输入至少 6 位密码。");
    }
  });

  it("rejects inactive users", async () => {
    // First ensure user exists with password hash
    const passwordHash = await bcrypt.hash("test123", 10);
    await prisma.user.upsert({
      where: { username: "inactive-test" },
      update: { active: false, passwordHash },
      create: {
        username: "inactive-test",
        displayName: "Inactive Test",
        role: "USER",
        active: false,
        passwordHash,
      },
    });

    const result = await authenticateMockUser("inactive-test", "test123");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("账号不存在或未启用。");
    }
  });
});
