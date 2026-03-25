import { prisma } from "@/lib/prisma";
import { buildBulkOperationResult } from "@/lib/db/bulk";
import type {
  AppCategoryBulkAction,
  AppCategoryRecord,
  BulkOperationResult,
} from "@/lib/types";

export type AppCategoryItem = AppCategoryRecord;

function mapCategory(category: {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
  appCount?: number;
}): AppCategoryRecord {
  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    enabled: category.enabled,
    appCount: category.appCount ?? 0,
  };
}

async function loadCategoryAppCountMap() {
  const counts = await prisma.app.groupBy({
    by: ["category"],
    where: {
      category: {
        not: null,
      },
    },
    _count: {
      category: true,
    },
  });

  return new Map(
    counts
      .filter((item) => typeof item.category === "string" && item.category.trim())
      .map((item) => [item.category as string, item._count.category]),
  );
}

export async function getEnabledCategories(): Promise<AppCategoryItem[]> {
  const [categories, appCountMap] = await Promise.all([
    prisma.appCategory.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    }),
    loadCategoryAppCountMap(),
  ]);

  return categories.map((category) =>
    mapCategory({ ...category, appCount: appCountMap.get(category.name) ?? 0 }),
  );
}

export async function getAllCategories(): Promise<AppCategoryItem[]> {
  const [categories, appCountMap] = await Promise.all([
    prisma.appCategory.findMany({
      orderBy: { sortOrder: "asc" },
    }),
    loadCategoryAppCountMap(),
  ]);

  return categories.map((category) =>
    mapCategory({ ...category, appCount: appCountMap.get(category.name) ?? 0 }),
  );
}

export async function createCategory(input: {
  name: string;
  sortOrder?: number;
  enabled?: boolean;
}) {
  const normalizedName = input.name.trim();
  if (!normalizedName) {
    throw new Error("分类名称不能为空");
  }

  const duplicate = await prisma.appCategory.findUnique({
    where: { name: normalizedName },
  });

  if (duplicate) {
    throw new Error("分类名称已存在");
  }

  const category = await prisma.appCategory.create({
    data: {
      name: normalizedName,
      sortOrder: input.sortOrder ?? 0,
      enabled: input.enabled ?? true,
    },
  });

  return mapCategory(category);
}

export async function updateCategory(
  id: string,
  input: { name?: string; sortOrder?: number; enabled?: boolean },
) {
  const current = await prisma.appCategory.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error("分类不存在");
  }

  const nextName = input.name?.trim() || current.name;
  if (nextName !== current.name) {
    const duplicate = await prisma.appCategory.findFirst({
      where: {
        name: nextName,
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new Error("分类名称已存在");
    }
  }

  const category = await prisma.$transaction(async (tx) => {
    if (nextName !== current.name) {
      await tx.app.updateMany({
        where: { category: current.name },
        data: { category: nextName },
      });
    }

    return tx.appCategory.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: nextName } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      },
    });
  });

  return mapCategory(category);
}

export async function deleteCategory(id: string) {
  const current = await prisma.appCategory.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error("分类不存在");
  }

  await prisma.$transaction(async (tx) => {
    await tx.app.updateMany({
      where: { category: current.name },
      data: { category: null },
    });

    await tx.appCategory.delete({
      where: { id },
    });
  });
}

export async function bulkOperateCategories(input: {
  ids: string[];
  action: AppCategoryBulkAction;
}): Promise<BulkOperationResult> {
  const results: Array<{ id: string; status: "success" | "skipped" | "failed"; message: string }> = [];

  for (const [index, id] of input.ids.entries()) {
    const current = await prisma.appCategory.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!current) {
      results.push({ id, status: "skipped", message: "分类不存在" });
      continue;
    }

    try {
      if (input.action.type === "setEnabled") {
        await updateCategory(id, { enabled: input.action.enabled });
        results.push({ id, status: "success", message: input.action.enabled ? "分类已启用" : "分类已停用" });
      } else if (input.action.type === "setSortOrder") {
        await updateCategory(id, { sortOrder: input.action.startSortOrder + index });
        results.push({ id, status: "success", message: "分类排序已更新" });
      } else if (input.action.type === "delete") {
        await deleteCategory(id);
        results.push({ id, status: "success", message: "分类已删除" });
      }
    } catch (error) {
      results.push({
        id,
        status: "failed",
        message: error instanceof Error ? error.message : "批量操作失败",
      });
    }
  }

  return buildBulkOperationResult(results);
}
