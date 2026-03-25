import { buildNodesFromAppConfig } from "@/lib/app-parser";
import { buildBulkOperationResult } from "@/lib/db/bulk";
import { formatPriceFen } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { normalizeRunningHubAllowedChannelCodes } from "@/lib/runninghub-channels";
import { normalizeShowcaseImages } from "@/lib/showcase-images";
import type { AppBulkAction, AppDefinition, BulkOperationResult } from "@/lib/types";

export interface AppWithRunCount {
  id: string;
  code: string;
  name: string;
  description: string;
  iconUrl: string | null;
  iconBgColor: string | null;
  category: string | null;
  tags: string[];
  enabled: boolean;
  shareResults: boolean;
  runCount: number;
  coverPoster: string | null;
  showcaseImages?: string[];
  authorName: string | null;
  authorAvatar: string | null;
  badgeLabel: string | null;
  estimatedPriceFen: number;
  estimatedPriceLabel: string;
  sortOrder: number;
  viewCount: number;
  providerAppId: string;
  updatedAt: Date;
}

type DbAppWithTags = Awaited<ReturnType<typeof prisma.app.findFirst>> & {
  tags?: Array<{ tag: { name: string } }>;
};

export interface AppDeletionSummary {
  tasksDeleted: number;
  syncLogsDeleted: number;
  taskAssetsDeleted: number;
}

export interface DeletedAppResult {
  app: {
    id: string;
    code: string;
    name: string;
  };
  summary: AppDeletionSummary;
}

export async function getEnabledApps(): Promise<AppDefinition[]> {
  const apps = await prisma.app.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  return apps.map((app) => mapDbAppToDefinition(app));
}

export async function getEnabledAppsWithStats(): Promise<AppWithRunCount[]> {
  return listAppsWithStats({ enabledOnly: true });
}

export async function getAllAppsWithStats(): Promise<AppWithRunCount[]> {
  return listAppsWithStats({ enabledOnly: false });
}

async function listAppsWithStats(input: { enabledOnly: boolean }): Promise<AppWithRunCount[]> {
  const apps = await prisma.app.findMany({
    ...(input.enabledOnly ? { where: { enabled: true } } : {}),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      _count: {
        select: { tasks: true },
      },
      tags: {
        include: { tag: true },
      },
    },
  });

  return apps.map((app) => ({
    id: app.id,
    code: app.code,
    name: app.name,
    description: app.description,
    iconUrl: app.iconUrl,
    iconBgColor: app.iconBgColor,
    category: app.category,
    tags: app.tags.map((item) => item.tag.name),
    enabled: app.enabled,
    shareResults: app.shareResults,
    runCount: app._count.tasks,
    coverPoster: app.coverPoster,
    showcaseImages: normalizeShowcaseImages(app.showcaseImagesJson),
    authorName: app.authorName,
    authorAvatar: app.authorAvatar,
    badgeLabel: app.badgeLabel,
    estimatedPriceFen: app.estimatedPriceFen,
    estimatedPriceLabel: formatPriceFen(app.estimatedPriceFen),
    sortOrder: app.sortOrder,
    viewCount: app.viewCount,
    providerAppId: app.providerAppId,
    updatedAt: app.updatedAt,
  }));
}

export async function getAppByCode(code: string): Promise<AppDefinition | null> {
  const app = await prisma.app.findUnique({
    where: { code },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!app) {
    return null;
  }

  return mapDbAppToDefinition(app);
}

export function mapDbAppToDefinition(app: DbAppWithTags): AppDefinition {
  if (!app) {
    throw new Error("App data is required");
  }

  const formSchemaJson = app.formSchemaJson as unknown as AppDefinition["formSchemaJson"];
  const requestMappingJson = app.requestMappingJson as Record<string, string>;
  const defaultParamsJson = app.defaultParamsJson as Record<string, string>;
  const runninghubAllowedChannelCodesJson = normalizeRunningHubAllowedChannelCodes(
    app.runninghubAllowedChannelCodesJson,
  );

  return {
    id: app.id,
    code: app.code,
    name: app.name,
    description: app.description,
    provider: app.provider,
    providerAppId: app.providerAppId,
    enabled: app.enabled,
    shareResults: app.shareResults,
    statusLabel: app.enabled ? "已启用" : "已停用",
    outputType: "图片结果",
    syncTarget: "结果归档",
    category: app.category ?? "模板应用",
    formSchemaJson,
    requestMappingJson,
    defaultParamsJson,
    syncMappingJson: app.syncMappingJson as Record<string, string>,
    runninghubAllowedChannelCodesJson,
    nodes: buildNodesFromAppConfig(formSchemaJson, requestMappingJson, defaultParamsJson),
    tags: app.tags?.map((item) => item.tag.name) ?? [],
    showcaseImages: normalizeShowcaseImages(app.showcaseImagesJson),
    iconUrl: app.iconUrl,
    iconBgColor: app.iconBgColor,
    coverPoster: app.coverPoster ?? null,
    authorName: app.authorName ?? null,
    authorAvatar: app.authorAvatar ?? null,
    badgeLabel: app.badgeLabel ?? null,
    estimatedPriceFen: app.estimatedPriceFen,
    estimatedPriceLabel: formatPriceFen(app.estimatedPriceFen),
    sortOrder: app.sortOrder ?? 0,
    viewCount: app.viewCount ?? 0,
  };
}

function normalizeTags(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(new Set(input.map((item) => String(item).trim()).filter(Boolean)));
}

function formatDeletionSummaryMessage(input: DeletedAppResult) {
  const { app, summary } = input;
  return `App ${app.name} deleted. Removed ${summary.tasksDeleted} tasks, ${summary.syncLogsDeleted} sync logs, and ${summary.taskAssetsDeleted} task assets.`;
}

async function deleteAppWithRelations(input: {
  id: string;
  code: string;
  name: string;
}): Promise<DeletedAppResult> {
  return prisma.$transaction(async (tx) => {
    const tasks = await tx.task.findMany({
      where: { appId: input.id },
      select: { id: true },
    });
    const taskIds = tasks.map((task) => task.id);

    const syncLogResult =
      taskIds.length > 0
        ? await tx.syncLog.deleteMany({
            where: { taskId: { in: taskIds } },
          })
        : { count: 0 };
    const taskAssetResult =
      taskIds.length > 0
        ? await tx.taskAsset.deleteMany({
            where: { taskId: { in: taskIds } },
          })
        : { count: 0 };
    const taskResult =
      taskIds.length > 0
        ? await tx.task.deleteMany({
            where: { id: { in: taskIds } },
          })
        : { count: 0 };

    await tx.app.delete({
      where: { id: input.id },
    });

    return {
      app: {
        id: input.id,
        code: input.code,
        name: input.name,
      },
      summary: {
        tasksDeleted: taskResult.count,
        syncLogsDeleted: syncLogResult.count,
        taskAssetsDeleted: taskAssetResult.count,
      },
    };
  });
}

export async function deleteAppWithRelationsByCode(code: string): Promise<DeletedAppResult | null> {
  const app = await prisma.app.findUnique({
    where: { code },
    select: { id: true, code: true, name: true },
  });

  if (!app) {
    return null;
  }

  return deleteAppWithRelations(app);
}

export async function bulkOperateApps(input: {
  ids: string[];
  action: AppBulkAction;
}): Promise<BulkOperationResult> {
  const results: Array<{ id: string; status: "success" | "skipped" | "failed"; message: string }> =
    [];

  for (const [index, id] of input.ids.entries()) {
    const current = await prisma.app.findUnique({
      where: { id },
      select: { id: true, code: true, name: true },
    });

    if (!current) {
      results.push({ id, status: "skipped", message: "应用不存在" });
      continue;
    }

    try {
      if (input.action.type === "delete") {
        const deleted = await deleteAppWithRelations(current);
        results.push({ id, status: "success", message: formatDeletionSummaryMessage(deleted) });
        continue;
      }

      if (input.action.type === "setEnabled") {
        await prisma.app.update({
          where: { id },
          data: { enabled: input.action.enabled },
        });
        results.push({
          id,
          status: "success",
          message: input.action.enabled ? "应用已启用" : "应用已停用",
        });
        continue;
      }

      if (input.action.type === "setCategory") {
        await prisma.app.update({
          where: { id },
          data: { category: input.action.category },
        });
        results.push({ id, status: "success", message: "应用分类已更新" });
        continue;
      }

      if (input.action.type === "setShareResults") {
        await prisma.app.update({
          where: { id },
          data: { shareResults: input.action.shareResults },
        });
        results.push({
          id,
          status: "success",
          message: input.action.shareResults ? "已开启结果共享" : "已关闭结果共享",
        });
        continue;
      }

      if (input.action.type === "setSortOrder") {
        await prisma.app.update({
          where: { id },
          data: { sortOrder: input.action.startSortOrder + index },
        });
        results.push({ id, status: "success", message: "应用排序已更新" });
        continue;
      }

      if (input.action.type === "setTags") {
        const normalizedTags = normalizeTags(input.action.tags);
        await prisma.app.update({
          where: { id },
          data: {
            tags: {
              deleteMany: {},
              create: normalizedTags.map((tagName) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: { name: tagName },
                  },
                },
              })),
            },
          },
        });
        results.push({ id, status: "success", message: "应用标签已更新" });
      }
    } catch (error) {
      results.push({
        id,
        status: "failed",
        message: error instanceof Error ? error.message : "鎵归噺鎿嶄綔澶辫触",
      });
    }
  }

  return buildBulkOperationResult(results);
}

