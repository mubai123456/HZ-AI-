import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { canRemoveActiveAdmin, deleteUserPermanently, getUserById, getUserDeletionBlockers, getUsers } from "@/lib/db/users";

function buildSiteTaskNo(sequence: number) {
  return `WB-${String(800000 + sequence).padStart(6, "0")}`;
}

async function ensureUser(params: {
  username: string;
  displayName: string;
  role?: "USER" | "ADMIN";
  active?: boolean;
}) {
  return prisma.user.upsert({
    where: { username: params.username },
    update: {
      displayName: params.displayName,
      role: params.role ?? "USER",
      active: params.active ?? true,
    },
    create: {
      username: params.username,
      displayName: params.displayName,
      role: params.role ?? "USER",
      active: params.active ?? true,
    },
  });
}

async function ensureApp(code: string) {
  return prisma.app.upsert({
    where: { code },
    update: {
      name: `测试应用 ${code}`,
      description: "用户删除测试应用",
      provider: "runninghub",
      providerAppId: code,
      enabled: true,
      formSchemaJson: [],
      requestMappingJson: {},
      defaultParamsJson: {},
      syncMappingJson: {},
    },
    create: {
      code,
      name: `测试应用 ${code}`,
      description: "用户删除测试应用",
      provider: "runninghub",
      providerAppId: code,
      enabled: true,
      formSchemaJson: [],
      requestMappingJson: {},
      defaultParamsJson: {},
      syncMappingJson: {},
    },
  });
}

describe("用户管理安全规则", () => {
  beforeEach(async () => {
    await prisma.task.deleteMany({
      where: {
        taskNo: {
          startsWith: "user-delete-test-",
        },
      },
    });
    await prisma.app.deleteMany({
      where: {
        code: {
          startsWith: "user-delete-test-",
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        username: {
          in: [
            "user-delete-clean",
            "user-delete-history",
            "user-admin-primary",
            "user-admin-secondary",
          ],
        },
      },
    });
  });

  it("可以永久删除没有历史数据的账号", async () => {
    const user = await ensureUser({
      username: "user-delete-clean",
      displayName: "可删除账号",
    });

    const result = await deleteUserPermanently(user.id);

    expect(result.ok).toBe(true);
    expect(await getUserById(user.id)).toBeNull();
  });

  it("有任务历史的账号会转成归档删除，并从用户列表中消失", async () => {
    const user = await ensureUser({
      username: "user-delete-history",
      displayName: "有历史账号",
    });
    const app = await ensureApp("user-delete-test-app");

    await prisma.task.create({
      data: {
        siteTaskNo: buildSiteTaskNo(1),
        taskNo: "user-delete-test-task",
        status: "QUEUED",
        syncStatus: "PENDING",
        appId: app.id,
        createdById: user.id,
      },
    });

    const blockers = await getUserDeletionBlockers(user.id);
    const result = await deleteUserPermanently(user.id);

    expect(blockers.some((item) => item.key === "tasks" && item.count === 1)).toBe(true);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.mode).toBe("archived");
    expect(await getUserById(user.id)).toBeNull();
    const users = await getUsers();
    expect(users.some((item) => item.username === "user-delete-history")).toBe(false);

    const archived = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        username: true,
        active: true,
        deletedAt: true,
        passwordHash: true,
      },
    });
    expect(archived.username).not.toBe("user-delete-history");
    expect(archived.active).toBe(false);
    expect(archived.deletedAt).not.toBeNull();
    expect(archived.passwordHash).toBeNull();
  });

  it("会阻止移除最后一个启用中的管理员", async () => {
    const primaryAdmin = await ensureUser({
      username: "user-admin-primary",
      displayName: "主管理员",
      role: "ADMIN",
      active: true,
    });
    const otherAdmins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        NOT: { id: primaryAdmin.id },
      },
      select: {
        id: true,
        active: true,
      },
    });

    try {
      await Promise.all(
        otherAdmins.map((admin) =>
          prisma.user.update({
            where: { id: admin.id },
            data: { active: false },
          }),
        ),
      );

      expect(await canRemoveActiveAdmin(primaryAdmin.id)).toBe(false);

      await ensureUser({
        username: "user-admin-secondary",
        displayName: "第二管理员",
        role: "ADMIN",
        active: true,
      });

      expect(await canRemoveActiveAdmin(primaryAdmin.id)).toBe(true);
    } finally {
      await Promise.all(
        otherAdmins.map((admin) =>
          prisma.user.update({
            where: { id: admin.id },
            data: { active: admin.active },
          }),
        ),
      );
    }
  });
});
