import { beforeEach, describe, expect, it } from "vitest";

import { getAssetGallery, getTaskById, getTasksForUser } from "@/lib/db/tasks";
import { prisma } from "@/lib/prisma";

function buildSiteTaskNo(sequence: number) {
  return `WB-${String(700000 + sequence).padStart(6, "0")}`;
}

async function ensureUser(params: {
  username: string;
  displayName: string;
  role?: "USER" | "ADMIN";
}) {
  return prisma.user.upsert({
    where: { username: params.username },
    update: {
      displayName: params.displayName,
      role: params.role ?? "USER",
      active: true,
    },
    create: {
      username: params.username,
      displayName: params.displayName,
      role: params.role ?? "USER",
      active: true,
    },
  });
}

async function ensureApp(
  code: string,
  shareResults: boolean,
  formSchemaJson: Array<{
    key: string;
    label: string;
    type: "image" | "textarea" | "select";
    hidden?: boolean;
  }> = [],
) {
  return prisma.app.upsert({
    where: { code },
    update: {
      name: `任务测试应用 ${code}`,
      description: "任务可见性测试应用",
      provider: "RUNNINGHUB",
      providerAppId: code,
      enabled: true,
      shareResults,
      formSchemaJson,
      requestMappingJson: {},
      defaultParamsJson: {},
      syncMappingJson: {},
    },
    create: {
      code,
      name: `任务测试应用 ${code}`,
      description: "任务可见性测试应用",
      provider: "RUNNINGHUB",
      providerAppId: code,
      enabled: true,
      shareResults,
      formSchemaJson,
      requestMappingJson: {},
      defaultParamsJson: {},
      syncMappingJson: {},
    },
  });
}

describe("任务可见性规则", () => {
  beforeEach(async () => {
    await prisma.taskAsset.deleteMany({
      where: {
        task: {
          taskNo: {
            startsWith: "task-visibility-",
          },
        },
      },
    });
    await prisma.syncLog.deleteMany({
      where: {
        task: {
          taskNo: {
            startsWith: "task-visibility-",
          },
        },
      },
    });
    await prisma.task.deleteMany({
      where: {
        taskNo: {
          startsWith: "task-visibility-",
        },
      },
    });
    await prisma.app.deleteMany({
      where: {
        code: {
          startsWith: "task-visibility-",
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        username: {
          in: ["task-visibility-a", "task-visibility-b", "task-visibility-admin"],
        },
      },
    });
  });

  it("普通用户只会看到自己的任务，不再包含共享应用里他人的成功结果", async () => {
    const userA = await ensureUser({
      username: "task-visibility-a",
      displayName: "用户 A",
    });
    const userB = await ensureUser({
      username: "task-visibility-b",
      displayName: "用户 B",
    });
    const privateApp = await ensureApp("task-visibility-private", false);
    const sharedApp = await ensureApp("task-visibility-shared", true);

    await prisma.task.createMany({
      data: [
        {
          siteTaskNo: buildSiteTaskNo(1),
          taskNo: "task-visibility-own-running",
          appId: privateApp.id,
          createdById: userA.id,
          status: "RUNNING",
          providerTaskId: "provider-own-running",
          syncStatus: "FAILED",
          syncErrorMessage: "own sync error",
          prompt: "自己的运行中任务",
        },
        {
          siteTaskNo: buildSiteTaskNo(2),
          taskNo: "task-visibility-own-failed",
          appId: sharedApp.id,
          createdById: userA.id,
          status: "FAILED",
          syncStatus: "SUCCESS",
          prompt: "自己的失败任务",
        },
        {
          siteTaskNo: buildSiteTaskNo(3),
          taskNo: "task-visibility-other-private-success",
          appId: privateApp.id,
          createdById: userB.id,
          status: "SUCCEEDED",
          syncStatus: "SUCCESS",
          prompt: "别人的私有成功任务",
        },
        {
          siteTaskNo: buildSiteTaskNo(4),
          taskNo: "task-visibility-other-shared-success",
          appId: sharedApp.id,
          createdById: userB.id,
          status: "SUCCEEDED",
          syncStatus: "FAILED",
          syncErrorMessage: "shared sync error",
          prompt: "别人的共享成功任务",
        },
      ],
    });

    const tasks = await getTasksForUser("USER", userA.id);
    const taskNos = tasks.map((task) => task.taskNo);

    expect(taskNos).toContain("task-visibility-own-running");
    expect(taskNos).toContain("task-visibility-own-failed");
    expect(taskNos).not.toContain("task-visibility-other-private-success");
    expect(taskNos).not.toContain("task-visibility-other-shared-success");

    const ownTask = tasks.find((task) => task.taskNo === "task-visibility-own-running");
    expect(ownTask?.ownerName).toBe("用户 A");
    expect(ownTask?.siteTaskNo).toBe(buildSiteTaskNo(1));
    expect(ownTask?.isSharedResult).toBeUndefined();
    expect(ownTask?.syncStatus).toBeUndefined();
    expect(ownTask?.providerTaskId).toBe("provider-own-running");
  });

  it("普通用户不能再打开他人的共享任务详情", async () => {
    const userA = await ensureUser({
      username: "task-visibility-a",
      displayName: "用户 A",
    });
    const userB = await ensureUser({
      username: "task-visibility-b",
      displayName: "用户 B",
    });
    const sharedApp = await ensureApp("task-visibility-shared", true);

    const task = await prisma.task.create({
      data: {
        siteTaskNo: buildSiteTaskNo(5),
        taskNo: "task-visibility-other-shared-success",
        appId: sharedApp.id,
        createdById: userB.id,
        status: "SUCCEEDED",
        syncStatus: "FAILED",
        syncErrorMessage: "shared sync error",
        prompt: "不应该继续暴露的共享结果",
      },
    });

    const visible = await getTaskById(task.id, {
      role: "USER",
      userId: userA.id,
    });

    expect(visible).toBeNull();
  });

  it("管理员仍然可以查看完整任务详情", async () => {
    const admin = await ensureUser({
      username: "task-visibility-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const userB = await ensureUser({
      username: "task-visibility-b",
      displayName: "用户 B",
    });
    const sharedApp = await ensureApp("task-visibility-shared", true);

    const task = await prisma.task.create({
      data: {
        siteTaskNo: buildSiteTaskNo(6),
        taskNo: "task-visibility-admin-check",
        appId: sharedApp.id,
        createdById: userB.id,
        status: "SUCCEEDED",
        syncStatus: "FAILED",
        syncErrorMessage: "shared sync error",
        prompt: "管理员应该能看到",
      },
    });

    const visible = await getTaskById(task.id, {
      role: "ADMIN",
      userId: admin.id,
    });

    expect(visible).not.toBeNull();
    expect(visible?.ownerName).toBe("用户 B");
    expect(visible?.prompt).toBe("管理员应该能看到");
    expect(visible?.syncStatus).toBe("FAILED");
  });

  it("returns app input schema metadata for task detail rendering", async () => {
    const admin = await ensureUser({
      username: "task-visibility-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const owner = await ensureUser({
      username: "task-visibility-b",
      displayName: "用户 B",
    });
    const app = await ensureApp("task-visibility-schema", false, [
      { key: "reference_image", label: "参考图", type: "image" },
      { key: "prompt", label: "创作 Prompt", type: "textarea" },
      { key: "style", label: "风格", type: "select" },
      { key: "internal_note", label: "内部备注", type: "textarea", hidden: true },
    ]);

    const task = await prisma.task.create({
      data: {
        siteTaskNo: buildSiteTaskNo(9),
        taskNo: "task-visibility-schema-detail",
        appId: app.id,
        createdById: owner.id,
        status: "SUCCEEDED",
        syncStatus: "SUCCESS",
        prompt: "样式化主提示词",
      },
    });

    const visible = (await getTaskById(task.id, {
      role: "ADMIN",
      userId: admin.id,
    })) as {
      appInputSchema?: Array<{ key: string; label: string; type: string; hidden?: boolean }>;
    } | null;

    expect(visible?.appInputSchema).toEqual([
      { key: "reference_image", label: "参考图", type: "image", hidden: false },
      { key: "prompt", label: "创作 Prompt", type: "textarea", hidden: false },
      { key: "style", label: "风格", type: "select", hidden: false },
      { key: "internal_note", label: "内部备注", type: "textarea", hidden: true },
    ]);
  });

  it("普通用户的输出图库只包含自己的产物", async () => {
    const userA = await ensureUser({
      username: "task-visibility-a",
      displayName: "用户 A",
    });
    const userB = await ensureUser({
      username: "task-visibility-b",
      displayName: "用户 B",
    });
    const sharedApp = await ensureApp("task-visibility-shared", true);

    const [ownTask, otherTask] = await Promise.all([
      prisma.task.create({
        data: {
          siteTaskNo: buildSiteTaskNo(7),
          taskNo: "task-visibility-own-gallery",
          appId: sharedApp.id,
          createdById: userA.id,
          status: "SUCCEEDED",
          syncStatus: "SUCCESS",
        },
      }),
      prisma.task.create({
        data: {
          siteTaskNo: buildSiteTaskNo(8),
          taskNo: "task-visibility-other-gallery",
          appId: sharedApp.id,
          createdById: userB.id,
          status: "SUCCEEDED",
          syncStatus: "SUCCESS",
        },
      }),
    ]);

    await prisma.taskAsset.createMany({
      data: [
        {
          taskId: ownTask.id,
          kind: "OUTPUT",
          name: "自己的结果图",
          url: "/own-output.png",
        },
        {
          taskId: otherTask.id,
          kind: "OUTPUT",
          name: "别人的结果图",
          url: "/other-output.png",
        },
      ],
    });

    const assets = await getAssetGallery(userA.id, "USER");

    expect(assets).toHaveLength(1);
    expect(assets[0]?.taskNo).toBe("task-visibility-own-gallery");
    expect(assets[0]?.url).toBe("/own-output.png");
  });
});
