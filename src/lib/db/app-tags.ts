import { prisma } from "@/lib/prisma";
import type { AppTagBulkAction, AppTagRecord, BulkOperationResult } from "@/lib/types";
import { buildBulkOperationResult } from "@/lib/db/bulk";

export async function listAppTags(): Promise<AppTagRecord[]> {
  const tags = await prisma.appTag.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    sortOrder: tag.sortOrder,
  }));
}

export async function createAppTag(input: {
  name: string;
  color?: string | null;
}) {
  const normalizedName = input.name.trim();
  if (!normalizedName) {
    throw new Error("标签名称不能为空");
  }

  const existing = await prisma.appTag.findUnique({
    where: { name: normalizedName },
  });

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      color: existing.color,
      sortOrder: existing.sortOrder,
    } satisfies AppTagRecord;
  }

  const tag = await prisma.appTag.create({
    data: {
      name: normalizedName,
      color: input.color?.trim() || "#2563EB",
    },
  });

  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    sortOrder: tag.sortOrder,
  } satisfies AppTagRecord;
}

export async function updateAppTag(
  id: string,
  input: { name?: string; color?: string | null; sortOrder?: number },
): Promise<AppTagRecord> {
  const current = await prisma.appTag.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error("标签不存在");
  }

  const nextName = input.name?.trim() || current.name;
  if (nextName !== current.name) {
    const duplicate = await prisma.appTag.findFirst({
      where: {
        name: nextName,
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new Error("标签名称已存在");
    }
  }

  const tag = await prisma.appTag.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: nextName } : {}),
      ...(input.color !== undefined ? { color: input.color?.trim() || current.color } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });

  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    sortOrder: tag.sortOrder,
  };
}

export async function deleteAppTag(id: string) {
  const current = await prisma.appTag.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error("标签不存在");
  }

  await prisma.appTag.delete({
    where: { id },
  });
}

export async function bulkOperateAppTags(input: {
  ids: string[];
  action: AppTagBulkAction;
}): Promise<BulkOperationResult> {
  const results = [];

  for (const id of input.ids) {
    const current = await prisma.appTag.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!current) {
      results.push({ id, status: "skipped", message: "标签不存在" } as const);
      continue;
    }

    try {
      if (input.action.type === "delete") {
        await deleteAppTag(id);
        results.push({ id, status: "success", message: "标签已删除" } as const);
      }
    } catch (error) {
      results.push({
        id,
        status: "failed",
        message: error instanceof Error ? error.message : "批量操作失败",
      } as const);
    }
  }

  return buildBulkOperationResult(results);
}
