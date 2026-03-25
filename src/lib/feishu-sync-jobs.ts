import { prisma } from "@/lib/prisma";

type FeishuSyncRunner = (
  taskId: string,
  action: "create" | "update",
  actorId?: string,
) => Promise<{ ok: boolean; error?: string }>;

export async function backfillFeishuSyncForTasks(
  input: {
    appId?: string;
    actorId?: string;
    mode?: "DIRTY" | "ALL";
  } = {},
  syncRunner?: FeishuSyncRunner,
): Promise<{ processed: number; successCount: number; failureCount: number }> {
  const tasks = await prisma.task.findMany({
    where: {
      ...(input.appId ? { appId: input.appId } : {}),
      ...(input.mode === "ALL"
        ? {}
        : {
            OR: [{ syncStatus: { not: "SUCCESS" } }, { feishuRecordId: null }],
          }),
    },
    select: {
      id: true,
      feishuRecordId: true,
    },
    orderBy: [{ siteTaskNo: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const runSync = syncRunner ?? defaultFeishuSyncRunner;
  let successCount = 0;
  let failureCount = 0;

  for (const task of tasks) {
    const result = await runSync(
      task.id,
      task.feishuRecordId ? "update" : "create",
      input.actorId,
    );

    if (result.ok) {
      successCount += 1;
    } else {
      failureCount += 1;
    }
  }

  return {
    processed: tasks.length,
    successCount,
    failureCount,
  };
}

async function defaultFeishuSyncRunner(
  taskId: string,
  action: "create" | "update",
  actorId?: string,
) {
  const { syncTaskToFeishu } = await import("@/lib/task-queue");
  return syncTaskToFeishu(taskId, action, actorId);
}
