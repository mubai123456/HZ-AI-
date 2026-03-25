import { beforeEach, describe, expect, it, vi } from "vitest";

import { backfillFeishuSyncForTasks } from "@/lib/feishu-sync-jobs";
import { prisma } from "@/lib/prisma";

function buildSiteTaskNo(sequence: number) {
  return `WB-${String(900000 + sequence).padStart(6, "0")}`;
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

async function ensureApp(code: string) {
  return prisma.app.upsert({
    where: { code },
    update: {
      name: `飞书补同步测试 ${code}`,
      description: "飞书补同步测试应用",
      provider: "RUNNINGHUB",
      providerAppId: code,
      enabled: true,
      shareResults: false,
      formSchemaJson: [],
      requestMappingJson: {},
      defaultParamsJson: {},
      syncMappingJson: {},
    },
    create: {
      code,
      name: `飞书补同步测试 ${code}`,
      description: "飞书补同步测试应用",
      provider: "RUNNINGHUB",
      providerAppId: code,
      enabled: true,
      shareResults: false,
      formSchemaJson: [],
      requestMappingJson: {},
      defaultParamsJson: {},
      syncMappingJson: {},
    },
  });
}

describe("backfillFeishuSyncForTasks", () => {
  beforeEach(async () => {
    await prisma.syncLog.deleteMany({
      where: {
        task: {
          taskNo: {
            startsWith: "feishu-backfill-",
          },
        },
      },
    });
    await prisma.taskAsset.deleteMany({
      where: {
        task: {
          taskNo: {
            startsWith: "feishu-backfill-",
          },
        },
      },
    });
    await prisma.task.deleteMany({
      where: {
        taskNo: {
          startsWith: "feishu-backfill-",
        },
      },
    });
    await prisma.app.deleteMany({
      where: {
        code: {
          startsWith: "feishu-backfill-",
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        username: {
          in: ["feishu-backfill-user", "feishu-backfill-admin"],
        },
      },
    });
  });

  it("only re-syncs tasks that are not successful or do not have a feishu record id by default", async () => {
    const admin = await ensureUser({
      username: "feishu-backfill-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const user = await ensureUser({
      username: "feishu-backfill-user",
      displayName: "普通用户",
    });
    const appA = await ensureApp("feishu-backfill-app-a");
    const appB = await ensureApp("feishu-backfill-app-b");

    const [taskCreate, taskUpdate, taskSkip, taskMissingRecord] = await Promise.all([
      prisma.task.create({
        data: {
          siteTaskNo: buildSiteTaskNo(1),
          taskNo: "feishu-backfill-create",
          appId: appA.id,
          createdById: user.id,
          status: "SUCCEEDED",
          syncStatus: "FAILED",
        },
      }),
      prisma.task.create({
        data: {
          siteTaskNo: buildSiteTaskNo(2),
          taskNo: "feishu-backfill-update",
          appId: appA.id,
          createdById: user.id,
          status: "SUCCEEDED",
          syncStatus: "PENDING",
          feishuRecordId: "rec_123",
        },
      }),
      prisma.task.create({
        data: {
          siteTaskNo: buildSiteTaskNo(3),
          taskNo: "feishu-backfill-skip",
          appId: appA.id,
          createdById: user.id,
          status: "SUCCEEDED",
          syncStatus: "SUCCESS",
          feishuRecordId: "rec_456",
        },
      }),
      prisma.task.create({
        data: {
          siteTaskNo: buildSiteTaskNo(4),
          taskNo: "feishu-backfill-missing-record",
          appId: appA.id,
          createdById: user.id,
          status: "SUCCEEDED",
          syncStatus: "SUCCESS",
          feishuRecordId: null,
        },
      }),
    ]);

    await prisma.task.create({
      data: {
        siteTaskNo: buildSiteTaskNo(5),
        taskNo: "feishu-backfill-other-app",
        appId: appB.id,
        createdById: user.id,
        status: "SUCCEEDED",
        syncStatus: "FAILED",
      },
    });

    const syncRunner = vi
      .fn<(taskId: string, action: "create" | "update", actorId?: string) => Promise<{ ok: boolean }>>()
      .mockResolvedValue({ ok: true });

    const summary = await backfillFeishuSyncForTasks(
      {
        appId: appA.id,
        actorId: admin.id,
      },
      syncRunner,
    );

    expect(syncRunner).toHaveBeenCalledTimes(3);
    expect(syncRunner).toHaveBeenNthCalledWith(1, taskCreate.id, "create", admin.id);
    expect(syncRunner).toHaveBeenNthCalledWith(2, taskUpdate.id, "update", admin.id);
    expect(syncRunner).toHaveBeenNthCalledWith(3, taskMissingRecord.id, "create", admin.id);
    expect(syncRunner).not.toHaveBeenCalledWith(taskSkip.id, "update", admin.id);
    expect(summary).toEqual({
      processed: 3,
      successCount: 3,
      failureCount: 0,
    });
  });

  it("supports re-syncing all tasks for a scope when requested", async () => {
    const admin = await ensureUser({
      username: "feishu-backfill-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const user = await ensureUser({
      username: "feishu-backfill-user",
      displayName: "普通用户",
    });
    const appA = await ensureApp("feishu-backfill-app-a");

    const [taskCreate, taskUpdate, taskMissingRecord] = await Promise.all([
      prisma.task.create({
        data: {
          siteTaskNo: buildSiteTaskNo(6),
          taskNo: "feishu-backfill-all-create",
          appId: appA.id,
          createdById: user.id,
          status: "FAILED",
          syncStatus: "FAILED",
        },
      }),
      prisma.task.create({
        data: {
          siteTaskNo: buildSiteTaskNo(7),
          taskNo: "feishu-backfill-all-update",
          appId: appA.id,
          createdById: user.id,
          status: "SUCCEEDED",
          syncStatus: "SUCCESS",
          feishuRecordId: "rec_all_123",
        },
      }),
      prisma.task.create({
        data: {
          siteTaskNo: buildSiteTaskNo(8),
          taskNo: "feishu-backfill-all-create-2",
          appId: appA.id,
          createdById: user.id,
          status: "SUCCEEDED",
          syncStatus: "SUCCESS",
          feishuRecordId: null,
        },
      }),
    ]);

    const syncRunner = vi
      .fn<(taskId: string, action: "create" | "update", actorId?: string) => Promise<{ ok: boolean }>>()
      .mockResolvedValue({ ok: true });

    const summary = await backfillFeishuSyncForTasks(
      {
        appId: appA.id,
        actorId: admin.id,
        mode: "ALL",
      },
      syncRunner,
    );

    expect(syncRunner).toHaveBeenCalledTimes(3);
    expect(syncRunner).toHaveBeenNthCalledWith(1, taskCreate.id, "create", admin.id);
    expect(syncRunner).toHaveBeenNthCalledWith(2, taskUpdate.id, "update", admin.id);
    expect(syncRunner).toHaveBeenNthCalledWith(3, taskMissingRecord.id, "create", admin.id);
    expect(summary).toEqual({
      processed: 3,
      successCount: 3,
      failureCount: 0,
    });
  });
});
