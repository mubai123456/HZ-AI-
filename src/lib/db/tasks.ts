import type { Prisma } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

import { formatPriceFen } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { buildTaskInputSchema, sortTaskInputAssets } from "@/lib/task-inputs";
import { syncTaskToFeishu } from "@/lib/task-queue";
import type {
  AppInputField,
  BulkOperationItem,
  BulkOperationResult,
  DashboardSummary,
  TaskBulkAction,
  TaskRecord,
  UserRole,
} from "@/lib/types";

type TaskViewer = {
  role: UserRole;
  userId: string;
};

type TaskQueryOptions = {
  appCode?: string;
  limit?: number;
};

export type TaskDownloadSource = {
  taskId: string;
  siteTaskNo: string;
  taskNo: string;
  asset: {
    id: string;
    name: string;
    mimeType: string | null;
    url: string | null;
    storageKey: string | null;
  };
};

export type TaskArchiveSource = {
  taskId: string;
  siteTaskNo: string;
  taskNo: string;
  assets: Array<{
    id: string;
    name: string;
    mimeType: string | null;
    url: string | null;
    storageKey: string | null;
  }>;
};

type TaskWithRelations = Prisma.TaskGetPayload<{
  include: {
    app: {
      select: {
        id: true;
        code: true;
        name: true;
        formSchemaJson: true;
        shareResults: true;
      };
    };
    createdBy: {
      select: {
        id: true;
        displayName: true;
      };
    };
    assets: true;
    syncLogs: true;
  };
}>;

function buildViewer(role: UserRole, userId: string): TaskViewer {
  return { role, userId };
}

function buildVisibleTaskWhere(
  viewer: TaskViewer,
  options: TaskQueryOptions = {},
): Prisma.TaskWhereInput {
  const filters: Prisma.TaskWhereInput[] = [];

  if (options.appCode) {
    filters.push({ app: { code: options.appCode } });
  }

  if (viewer.role !== "ADMIN") {
    filters.push({ createdById: viewer.userId });
  }

  if (filters.length === 0) {
    return {};
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return { AND: filters };
}

function canViewerAccessTask(task: TaskWithRelations, viewer: TaskViewer): boolean {
  if (viewer.role === "ADMIN") {
    return true;
  }

  return task.createdById === viewer.userId;
}

function formatDateTime(date: Date): string {
  return `${date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  })} ${date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function buildResultSummary(task: TaskWithRelations): string {
  if (task.status === "SUCCEEDED") {
    return "任务已完成";
  }

  if (task.status === "FAILED") {
    return task.providerErrorMessage ?? "任务失败";
  }

  if (task.status === "RUNNING") {
    return "任务运行中...";
  }

  if (task.status === "CANCELLED") {
    return "任务已取消";
  }

  return "任务排队中...";
}

function mapTaskToRecord(
  task: TaskWithRelations,
  viewer: TaskViewer,
  options: { includeAppInputSchema?: boolean } = {},
): TaskRecord {
  const canSeeOperationalFields = viewer.role === "ADMIN";
  const canSeeProviderTaskId = viewer.role === "ADMIN" || task.createdById === viewer.userId;
  const appInputSchema = buildTaskInputSchema(task.app.formSchemaJson as unknown as AppInputField[]);
  const inputAssets = sortTaskInputAssets(
    task.assets
      .filter((asset) => asset.kind === "INPUT")
      .map((asset) => ({
        id: asset.id,
        kind: "INPUT" as const,
        name: asset.name,
        url: asset.url ?? "",
        sourceSlot: asset.sourceSlot ?? undefined,
      })),
    appInputSchema,
  );

  return {
    id: task.id,
    siteTaskNo: task.siteTaskNo,
    taskNo: task.taskNo,
    appCode: task.app.code,
    appName: task.app.name,
    title: task.title ?? task.taskNo,
    ownerId: task.createdById,
    ownerName: task.createdBy.displayName,
    status: task.status,
    providerStatus: task.providerStatus ?? "PENDING",
    syncStatus: canSeeOperationalFields ? task.syncStatus : undefined,
    createdAt: formatDateTime(task.createdAt),
    createdAtIso: task.createdAt.toISOString(),
    startedAt: task.startedAt ? formatDateTime(task.startedAt) : undefined,
    startedAtIso: task.startedAt?.toISOString(),
    completedAt: task.completedAt ? formatDateTime(task.completedAt) : undefined,
    completedAtIso: task.completedAt?.toISOString(),
    queuePosition: task.queuePosition ?? undefined,
    providerTaskId: canSeeProviderTaskId ? task.providerTaskId ?? undefined : undefined,
    runninghubChannelCode: task.runninghubChannelCode ?? undefined,
    runninghubChannelName: task.runninghubChannelName ?? undefined,
    providerResultUrl: task.providerResultUrl ?? undefined,
    providerErrorMessage: task.providerErrorMessage ?? undefined,
    syncErrorMessage: canSeeOperationalFields ? task.syncErrorMessage ?? undefined : undefined,
    prompt: task.prompt ?? "",
    estimatedPriceFenSnapshot: task.estimatedPriceFenSnapshot ?? null,
    estimatedPriceLabel:
      task.estimatedPriceFenSnapshot !== null && task.estimatedPriceFenSnapshot !== undefined
        ? formatPriceFen(task.estimatedPriceFenSnapshot)
        : null,
    params: (task.paramsJson as Record<string, string>) ?? {},
    resultSummary: buildResultSummary(task),
    resultItems: task.assets
      .filter((asset) => asset.kind === "OUTPUT")
      .map((asset) => ({
        id: asset.id,
        label: asset.name,
        url: asset.url ?? "",
      })),
    inputAssets,
    outputAssets: task.assets
      .filter((asset) => asset.kind === "OUTPUT")
      .map((asset) => ({
        id: asset.id,
        kind: "OUTPUT" as const,
        name: asset.name,
        url: asset.url ?? "",
      })),
    systemLogs: canSeeOperationalFields
      ? [task.providerTaskId, task.providerStatus, task.providerErrorMessage].filter(
          (item): item is string => Boolean(item),
        )
      : [],
    syncLogs: canSeeOperationalFields
      ? task.syncLogs.map((log) => ({
          time: log.createdAt.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          message: log.message ?? "",
          status: log.status,
        }))
      : [], 
    usage: task.usageJson as TaskRecord["usage"],
    appInputSchema: options.includeAppInputSchema ? appInputSchema : undefined,
  };
}

export async function getDashboardSummary(
  role: UserRole,
  userId: string,
): Promise<DashboardSummary> {
  const viewer = buildViewer(role, userId);
  const visibleWhere = buildVisibleTaskWhere(viewer);

  const [total, running, queued, succeeded, failed, recentTasks, syncFailedTasks, oldQueued] =
    await Promise.all([
      prisma.task.count({ where: visibleWhere }),
      prisma.task.count({ where: { AND: [visibleWhere, { status: "RUNNING" }] } }),
      prisma.task.count({ where: { AND: [visibleWhere, { status: "QUEUED" }] } }),
      prisma.task.count({ where: { AND: [visibleWhere, { status: "SUCCEEDED" }] } }),
      prisma.task.count({ where: { AND: [visibleWhere, { status: "FAILED" }] } }),
      prisma.task.findMany({
        where: visibleWhere,
        include: {
          app: {
            select: {
              id: true,
              code: true,
              name: true,
              formSchemaJson: true,
              shareResults: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              displayName: true,
            },
          },
          assets: true,
          syncLogs: true,
        },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      role === "ADMIN"
        ? prisma.task.count({ where: { syncStatus: "FAILED" } })
        : Promise.resolve(0),
      prisma.task.count({
        where: {
          AND: [
            visibleWhere,
            {
              status: "QUEUED",
              createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) },
            },
          ],
        },
      }),
    ]);

  const successRate = total === 0 ? 0 : Math.round((succeeded / total) * 100);
  const stats = [
    { label: "总任务", value: String(total), trend: total > 0 ? "当前范围" : "暂无" },
    { label: "运行中", value: String(running), trend: running > 0 ? "实时占用" : "空闲" },
    { label: "排队中", value: String(queued), trend: queued > 0 ? "等待处理" : "正常" },
    { label: "成功率", value: `${successRate}%`, trend: successRate > 0 ? "当前表现" : "暂无" },
  ];

  if (role === "ADMIN") {
    stats.push({
      label: "同步异常",
      value: String(syncFailedTasks),
      trend: syncFailedTasks > 0 ? "待处理" : "正常",
    });
  }

  const alerts: string[] = [];
  if (role === "ADMIN" && syncFailedTasks > 0) {
    alerts.push(`有 ${syncFailedTasks} 条结果归档异常，建议到后台处理。`);
  }
  if (failed > 0) {
    alerts.push(`有 ${failed} 条任务执行失败，建议检查任务输入或配置。`);
  }
  if (oldQueued > 0) {
    alerts.push(`有 ${oldQueued} 条任务排队超过 15 分钟，建议检查处理链路。`);
  }

  return {
    stats,
    recentTasks: recentTasks.map((task) => mapTaskToRecord(task, viewer)),
    alerts,
  };
}

export async function getTasksForUser(
  role: UserRole,
  userId: string,
  options: TaskQueryOptions = {},
): Promise<TaskRecord[]> {
  const viewer = buildViewer(role, userId);
  const tasks = await prisma.task.findMany({
    where: buildVisibleTaskWhere(viewer, options),
    include: {
      app: {
        select: {
          id: true,
          code: true,
          name: true,
          formSchemaJson: true,
          shareResults: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          displayName: true,
        },
      },
      assets: true,
      syncLogs: true,
    },
    orderBy: { createdAt: "desc" },
    ...(options.limit ? { take: options.limit } : {}),
  });

  return tasks.map((task) => mapTaskToRecord(task, viewer));
}

export async function getTaskById(
  taskId: string,
  viewerOrUserId?: string | TaskViewer,
): Promise<TaskRecord | null> {
  const task = await prisma.task.findFirst({
    where: {
      OR: [{ id: taskId }, { taskNo: taskId }],
    },
    include: {
      app: {
        select: {
          id: true,
          code: true,
          name: true,
          formSchemaJson: true,
          shareResults: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          displayName: true,
        },
      },
      assets: true,
      syncLogs: true,
    },
  });

  if (!task) {
    return null;
  }

  const viewer =
    typeof viewerOrUserId === "string"
      ? ({ role: "USER", userId: viewerOrUserId } as const)
      : viewerOrUserId;

  const effectiveViewer = viewer ?? {
    role: "ADMIN" as const,
    userId: task.createdById,
  };

  if (!canViewerAccessTask(task, effectiveViewer)) {
    return null;
  }

  return mapTaskToRecord(task, effectiveViewer, { includeAppInputSchema: true });
}

export async function getAssetGallery(
  userId?: string,
  role?: UserRole,
): Promise<Array<{ id: string; name: string; taskNo: string; url: string; createdByName: string }>> {
  const where: Prisma.TaskAssetWhereInput =
    role === "ADMIN" || !userId
      ? {
          kind: "OUTPUT",
          url: { not: null },
        }
      : {
          kind: "OUTPUT",
          url: { not: null },
          task: {
            createdById: userId,
          },
        };

  const assets = await prisma.taskAsset.findMany({
    where,
    include: {
      task: {
        select: {
          taskNo: true,
          createdById: true,
          createdBy: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    taskNo: asset.task.taskNo,
    url: asset.url ?? "",
    createdByName: asset.task.createdBy?.displayName ?? "--",
  }));
}

export async function getTaskOutputAssetDownloadSource(params: {
  taskId: string;
  assetId: string;
  userId: string;
  role: UserRole;
}): Promise<TaskDownloadSource | null> {
  const task = await prisma.task.findFirst({
    where: {
      OR: [{ id: params.taskId }, { taskNo: params.taskId }],
    },
    include: {
      app: {
        select: {
          id: true,
          code: true,
          name: true,
          formSchemaJson: true,
          shareResults: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          displayName: true,
        },
      },
      assets: {
        where: {
          id: params.assetId,
          kind: "OUTPUT",
        },
      },
      syncLogs: true,
    },
  });

  if (!task || !canViewerAccessTask(task, buildViewer(params.role, params.userId))) {
    return null;
  }

  const asset = task.assets[0];
  if (!asset || (!asset.storageKey && !asset.url)) {
    return null;
  }

  return {
    taskId: task.id,
    siteTaskNo: task.siteTaskNo,
    taskNo: task.taskNo,
    asset: {
      id: asset.id,
      name: asset.name,
      mimeType: asset.mimeType,
      url: asset.url,
      storageKey: asset.storageKey,
    },
  };
}

export async function getTaskOutputArchiveSource(params: {
  taskId: string;
  userId: string;
  role: UserRole;
}): Promise<TaskArchiveSource | null> {
  const task = await prisma.task.findFirst({
    where: {
      OR: [{ id: params.taskId }, { taskNo: params.taskId }],
    },
    include: {
      app: {
        select: {
          id: true,
          code: true,
          name: true,
          formSchemaJson: true,
          shareResults: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          displayName: true,
        },
      },
      assets: {
        where: {
          kind: "OUTPUT",
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      syncLogs: true,
    },
  });

  if (!task || !canViewerAccessTask(task, buildViewer(params.role, params.userId))) {
    return null;
  }

  const assets = task.assets
    .filter((asset) => asset.storageKey || asset.url)
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      mimeType: asset.mimeType,
      url: asset.url,
      storageKey: asset.storageKey,
    }));

  return {
    taskId: task.id,
    siteTaskNo: task.siteTaskNo,
    taskNo: task.taskNo,
    assets,
  };
}

function buildBulkSummary(results: BulkOperationItem[]): BulkOperationResult["summary"] {
  return {
    totalCount: results.length,
    successCount: results.filter((item) => item.status === "success").length,
    skippedCount: results.filter((item) => item.status === "skipped").length,
    failureCount: results.filter((item) => item.status === "failed").length,
  };
}

async function deleteTaskAssetFiles(storageKeys: string[]) {
  await Promise.all(
    storageKeys.map(async (storageKey) => {
      const normalizedKey = storageKey.replace(/^\/+/, "");
      const assetPath = path.join(process.cwd(), "public", normalizedKey);

      try {
        await fs.unlink(assetPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.warn(`[tasks] Failed to delete asset file ${assetPath}:`, error);
        }
      }
    }),
  );
}

async function deleteTaskCascade(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assets: {
        select: {
          storageKey: true,
        },
      },
    },
  });

  if (!task) {
    return { status: "skipped" as const, message: "任务不存在" };
  }

  const storageKeys = task.assets
    .map((asset) => asset.storageKey)
    .filter((storageKey): storageKey is string => Boolean(storageKey));

  await prisma.$transaction(async (tx) => {
    await tx.syncLog.deleteMany({ where: { taskId } });
    await tx.taskAsset.deleteMany({ where: { taskId } });
    await tx.task.delete({ where: { id: taskId } });
  });

  await deleteTaskAssetFiles(storageKeys);

  return { status: "success" as const, message: "任务已删除" };
}

async function retryTaskSync(taskId: string, operatorId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      feishuRecordId: true,
      syncStatus: true,
    },
  });

  if (!task) {
    return { status: "skipped" as const, message: "任务不存在" };
  }

  if (task.syncStatus !== "FAILED") {
    return { status: "skipped" as const, message: "当前任务没有待重试的同步异常" };
  }

  const action = task.feishuRecordId ? "update" : "create";
  const result = await syncTaskToFeishu(task.id, action, operatorId);

  if (!result.ok) {
    return { status: "failed" as const, message: result.error ?? "同步失败" };
  }

  return { status: "success" as const, message: "同步成功" };
}

export async function bulkOperateTasks(params: {
  ids: string[];
  action: TaskBulkAction;
  operatorId: string;
}): Promise<BulkOperationResult> {
  const results: BulkOperationItem[] = [];

  for (const id of params.ids) {
    try {
      if (params.action.type === "retrySync") {
        const result = await retryTaskSync(id, params.operatorId);
        results.push({ id, ...result });
        continue;
      }

      if (params.action.type === "delete") {
        const result = await deleteTaskCascade(id);
        results.push({ id, ...result });
      }
    } catch (error) {
      results.push({
        id,
        status: "failed",
        message: error instanceof Error ? error.message : "批量任务操作失败",
      });
    }
  }

  return {
    results,
    summary: buildBulkSummary(results),
  };
}
