/**
 * Sync data access layer - queries SyncLog + Task for sync overview
 */

import { prisma } from "@/lib/prisma";
import { getDisplayTaskId } from "@/lib/task-identity";

export interface SyncOverview {
  successCount: number;
  failedCount: number;
  retryCount: number;
  successRate: string;
  incidents: Array<{ taskId: string; siteTaskNo: string; displayTaskId: string; message: string }>;
}

/**
 * Get aggregated sync overview from SyncLog + Task tables
 * @param userId - if provided and role is not ADMIN, filters to only this user's tasks
 */
export async function getSyncOverview(userId?: string): Promise<SyncOverview> {
  const taskWhere = userId ? { task: { createdById: userId } } : {};

  const [successLogs, failedLogs, taskStats] = await Promise.all([
    prisma.syncLog.count({ where: { ...taskWhere, status: "SUCCESS" } }),
    prisma.syncLog.count({ where: { ...taskWhere, status: "FAILED" } }),
    prisma.task.findMany({
      where: { ...(userId ? { createdById: userId } : {}), syncStatus: "FAILED" },
      select: {
        id: true,
        siteTaskNo: true,
        taskNo: true,
        providerTaskId: true,
        syncErrorMessage: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const retryCount = await prisma.syncLog.count({
    where: {
      ...taskWhere,
      status: "FAILED",
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  const total = successLogs + failedLogs;
  const successRate = total === 0 ? "-" : `${Math.round((successLogs / total) * 1000) / 10}%`;

  const incidents = taskStats.map((task) => ({
    taskId: task.id,
    siteTaskNo: task.siteTaskNo,
    displayTaskId: getDisplayTaskId(task),
    message: task.syncErrorMessage ?? "同步失败",
  }));

  return {
    successCount: successLogs,
    failedCount: failedLogs,
    retryCount,
    successRate,
    incidents,
  };
}
