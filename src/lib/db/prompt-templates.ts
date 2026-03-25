import {
  Prisma,
  PromptTemplateMediaType,
  PromptTemplateScopeMode,
} from "@prisma/client";

import { buildBulkOperationResult } from "@/lib/db/bulk";
import { prisma } from "@/lib/prisma";
import type {
  BulkOperationResult,
  PromptTemplateAdminRecord,
  PromptTemplateBulkAction,
  PromptTemplateCategoryRecord,
  PromptTemplateCategoryBulkAction,
  PromptTemplateSafeRecord,
  PromptTagBulkAction,
  PromptTemplateTagRecord,
} from "@/lib/types";

const PROMPT_TEMPLATE_SAFE_SELECT = {
  id: true,
  name: true,
  description: true,
  coverImageUrl: true,
  sampleMediaType: true,
  sampleMediaUrl: true,
  samplePosterUrl: true,
  tags: true,
  usageCount: true,
  enabled: true,
  createdAt: true,
  category: {
    select: {
      id: true,
      name: true,
      color: true,
      sortOrder: true,
    },
  },
  favorites: {
    select: {
      userId: true,
    },
  },
  recentUses: {
    select: {
      lastUsedAt: true,
    },
  },
} satisfies Prisma.PromptTemplateSelect;

const PROMPT_TEMPLATE_ADMIN_INCLUDE = {
  category: true,
  appScopes: {
    select: {
      appCode: true,
    },
  },
} satisfies Prisma.PromptTemplateInclude;

type PromptTemplateSafeRow = Prisma.PromptTemplateGetPayload<{
  select: typeof PROMPT_TEMPLATE_SAFE_SELECT;
}>;

type PromptTemplateAdminRow = Prisma.PromptTemplateGetPayload<{
  include: typeof PROMPT_TEMPLATE_ADMIN_INCLUDE;
}>;

function splitTemplateTags(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeTags(tags?: string[] | string) {
  const rawTags = Array.isArray(tags) ? tags : splitTemplateTags(tags ?? "");
  return Array.from(new Set(rawTags.map((tag) => tag.trim()).filter(Boolean)));
}

function mapPromptTemplateCategory(category: {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  enabled: boolean;
}): PromptTemplateCategoryRecord {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    sortOrder: category.sortOrder,
    enabled: category.enabled,
  };
}

function mapPromptTemplateSafe(row: PromptTemplateSafeRow): PromptTemplateSafeRecord {
  const fallbackMediaUrl = row.sampleMediaUrl ?? row.coverImageUrl ?? null;
  const fallbackPosterUrl =
    row.sampleMediaType === PromptTemplateMediaType.VIDEO
      ? row.samplePosterUrl ?? row.coverImageUrl ?? null
      : row.samplePosterUrl ?? null;

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    coverImageUrl: row.coverImageUrl ?? null,
    sampleMediaType: row.sampleMediaType,
    sampleMediaUrl: fallbackMediaUrl,
    samplePosterUrl: fallbackPosterUrl,
    categoryId: row.category?.id ?? null,
    categoryName: row.category?.name ?? null,
    categoryColor: row.category?.color ?? null,
    categoryOrder: row.category?.sortOrder ?? null,
    tags: splitTemplateTags(row.tags),
    usageCount: row.usageCount,
    enabled: row.enabled,
    isFavorite: row.favorites.length > 0,
    lastUsedAt: row.recentUses[0]?.lastUsedAt.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapPromptTemplateAdmin(row: PromptTemplateAdminRow): PromptTemplateAdminRecord {
  const fallbackMediaUrl = row.sampleMediaUrl ?? row.coverImageUrl ?? null;
  const fallbackPosterUrl =
    row.sampleMediaType === PromptTemplateMediaType.VIDEO
      ? row.samplePosterUrl ?? row.coverImageUrl ?? null
      : row.samplePosterUrl ?? null;

  return {
    id: row.id,
    appCode: row.appCode ?? null,
    name: row.name,
    description: row.description ?? null,
    coverImageUrl: row.coverImageUrl ?? null,
    sampleMediaType: row.sampleMediaType,
    sampleMediaUrl: fallbackMediaUrl,
    samplePosterUrl: fallbackPosterUrl,
    categoryId: row.category?.id ?? null,
    categoryName: row.category?.name ?? null,
    categoryColor: row.category?.color ?? null,
    categoryOrder: row.category?.sortOrder ?? null,
    tags: splitTemplateTags(row.tags),
    usageCount: row.usageCount,
    enabled: row.enabled,
    isFavorite: false,
    lastUsedAt: null,
    createdAt: row.createdAt.toISOString(),
    scopeMode: row.scopeMode,
    scopeAppCodes: row.appScopes.map((scope) => scope.appCode),
    templatePrompt: row.templatePrompt,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildScopedTemplateWhere(appCode: string): Prisma.PromptTemplateWhereInput {
  return {
    OR: [
      { scopeMode: PromptTemplateScopeMode.GLOBAL },
      { appScopes: { some: { appCode } } },
      { appCode },
    ],
  };
}

export async function listPromptTags(): Promise<PromptTemplateTagRecord[]> {
  const tags = await prisma.promptTag.findMany({
    orderBy: { name: "asc" },
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
  }));
}

export async function createPromptTag(input: { name: string; color?: string | null }) {
  const normalizedName = input.name.trim();
  if (!normalizedName) {
    throw new Error("标签名称不能为空");
  }

  const existing = await prisma.promptTag.findUnique({
    where: { name: normalizedName },
  });

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      color: existing.color,
    } satisfies PromptTemplateTagRecord;
  }

  const tag = await prisma.promptTag.create({
    data: {
      name: normalizedName,
      color: input.color?.trim() || "#2563eb",
    },
  });

  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
  } satisfies PromptTemplateTagRecord;
}

export async function updatePromptTag(
  id: string,
  input: { name?: string; color?: string | null },
): Promise<PromptTemplateTagRecord> {
  const current = await prisma.promptTag.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error("标签不存在");
  }

  const nextName = input.name?.trim() || current.name;
  const nextColor = input.color?.trim() || current.color;

  if (nextName !== current.name) {
    const duplicate = await prisma.promptTag.findFirst({
      where: {
        name: nextName,
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new Error("标签名称已存在");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.promptTag.update({
      where: { id },
      data: {
        name: nextName,
        color: nextColor,
      },
    });

    if (nextName !== current.name) {
      const templates = await tx.promptTemplate.findMany({
        where: {
          tags: {
            contains: current.name,
          },
        },
        select: {
          id: true,
          tags: true,
        },
      });

      for (const template of templates) {
        const nextTags = splitTemplateTags(template.tags).map((tag) =>
          tag === current.name ? nextName : tag,
        );

        await tx.promptTemplate.update({
          where: { id: template.id },
          data: {
            tags: Array.from(new Set(nextTags)).join(", "),
          },
        });
      }
    }
  });

  return {
    id,
    name: nextName,
    color: nextColor,
  };
}

export async function deletePromptTag(id: string) {
  const current = await prisma.promptTag.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error("标签不存在");
  }

  await prisma.$transaction(async (tx) => {
    const templates = await tx.promptTemplate.findMany({
      where: {
        tags: {
          contains: current.name,
        },
      },
      select: {
        id: true,
        tags: true,
      },
    });

    for (const template of templates) {
      const nextTags = splitTemplateTags(template.tags).filter((tag) => tag !== current.name);
      await tx.promptTemplate.update({
        where: { id: template.id },
        data: {
          tags: nextTags.join(", "),
        },
      });
    }

    await tx.promptTag.delete({
      where: { id },
    });
  });
}

export async function bulkOperatePromptTags(input: {
  ids: string[];
  action: PromptTagBulkAction;
}): Promise<BulkOperationResult> {
  const results: Array<{ id: string; status: "success" | "skipped" | "failed"; message: string }> = [];

  for (const id of input.ids) {
    const current = await prisma.promptTag.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!current) {
      results.push({ id, status: "skipped", message: "标签不存在" });
      continue;
    }

    try {
      if (input.action.type === "delete") {
        await deletePromptTag(id);
        results.push({ id, status: "success", message: "标签已删除" });
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

export async function listPromptTemplateCategories(
  input?: { appCode?: string; enabledOnly?: boolean },
): Promise<PromptTemplateCategoryRecord[]> {
  const where: Prisma.PromptTemplateCategoryWhereInput = {
    ...(input?.enabledOnly ? { enabled: true } : {}),
  };

  if (input?.appCode) {
    where.templates = {
      some: {
        enabled: true,
        ...buildScopedTemplateWhere(input.appCode),
      },
    };
  }

  const categories = await prisma.promptTemplateCategory.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return categories.map(mapPromptTemplateCategory);
}

export async function createPromptTemplateCategory(input: {
  name: string;
  color?: string | null;
  sortOrder?: number;
  enabled?: boolean;
}) {
  const normalizedName = input.name.trim();
  if (!normalizedName) {
    throw new Error("分类名称不能为空");
  }

  const duplicate = await prisma.promptTemplateCategory.findUnique({
    where: { name: normalizedName },
  });

  if (duplicate) {
    throw new Error("分类名称已存在");
  }

  const category = await prisma.promptTemplateCategory.create({
    data: {
      name: normalizedName,
      color: input.color?.trim() || "#2563eb",
      sortOrder: input.sortOrder ?? 0,
      enabled: input.enabled ?? true,
    },
  });

  return mapPromptTemplateCategory(category);
}

export async function updatePromptTemplateCategory(
  id: string,
  input: {
    name?: string;
    color?: string | null;
    sortOrder?: number;
    enabled?: boolean;
  },
) {
  const current = await prisma.promptTemplateCategory.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error("分类不存在");
  }

  const nextName = input.name?.trim() || current.name;
  if (nextName !== current.name) {
    const duplicate = await prisma.promptTemplateCategory.findFirst({
      where: {
        name: nextName,
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new Error("分类名称已存在");
    }
  }

  const category = await prisma.promptTemplateCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: nextName } : {}),
      ...(input.color !== undefined ? { color: input.color?.trim() || current.color } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    },
  });

  return mapPromptTemplateCategory(category);
}

export async function deletePromptTemplateCategory(id: string) {
  const current = await prisma.promptTemplateCategory.findUnique({
    where: { id },
    include: {
      templates: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!current) {
    throw new Error("分类不存在");
  }

  if (current.templates.length > 0) {
    throw new Error("该分类已被模板使用，请先调整模板分类");
  }

  await prisma.promptTemplateCategory.delete({
    where: { id },
  });
}

export async function bulkOperatePromptTemplateCategories(input: {
  ids: string[];
  action: PromptTemplateCategoryBulkAction;
}): Promise<BulkOperationResult> {
  const results: Array<{ id: string; status: "success" | "skipped" | "failed"; message: string }> = [];

  for (const id of input.ids) {
    const current = await prisma.promptTemplateCategory.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!current) {
      results.push({ id, status: "skipped", message: "分类不存在" });
      continue;
    }

    try {
      if (input.action.type === "setEnabled") {
        await updatePromptTemplateCategory(id, { enabled: input.action.enabled });
        results.push({
          id,
          status: "success",
          message: input.action.enabled ? "分类已启用" : "分类已停用",
        });
      } else if (input.action.type === "delete") {
        await deletePromptTemplateCategory(id);
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

export async function listAdminPromptTemplates(): Promise<PromptTemplateAdminRecord[]> {
  const templates = await prisma.promptTemplate.findMany({
    include: PROMPT_TEMPLATE_ADMIN_INCLUDE,
    orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
  });

  return templates.map(mapPromptTemplateAdmin);
}

export async function getAdminPromptTemplateById(id: string) {
  const template = await prisma.promptTemplate.findUnique({
    where: { id },
    include: PROMPT_TEMPLATE_ADMIN_INCLUDE,
  });

  return template ? mapPromptTemplateAdmin(template) : null;
}

export async function createPromptTemplate(input: {
  appCode?: string | null;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  sampleMediaType?: PromptTemplateMediaType;
  sampleMediaUrl?: string | null;
  samplePosterUrl?: string | null;
  templatePrompt: string;
  tags?: string[] | string;
  enabled?: boolean;
  scopeMode?: PromptTemplateScopeMode;
  scopeAppCodes?: string[];
}) {
  const normalizedTags = normalizeTags(input.tags);
  const sampleMediaType = input.sampleMediaType ?? PromptTemplateMediaType.IMAGE;
  const sampleMediaUrl = input.sampleMediaUrl?.trim() || input.coverImageUrl?.trim() || null;
  const samplePosterUrl =
    sampleMediaType === PromptTemplateMediaType.VIDEO
      ? input.samplePosterUrl?.trim() || input.coverImageUrl?.trim() || null
      : null;
  const scopeAppCodes = Array.from(new Set((input.scopeAppCodes ?? []).filter(Boolean)));
  const scopeMode =
    input.scopeMode ??
    (scopeAppCodes.length > 0 ? PromptTemplateScopeMode.LIMITED : PromptTemplateScopeMode.GLOBAL);
  const legacyAppCode =
    scopeMode === PromptTemplateScopeMode.LIMITED
      ? scopeAppCodes[0] ?? input.appCode?.trim() ?? null
      : input.appCode?.trim() ?? null;

  if (!input.name.trim()) {
    throw new Error("模板名称不能为空");
  }

  if (!input.templatePrompt.trim()) {
    throw new Error("模板正文不能为空");
  }

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.promptTemplate.create({
      data: {
        appCode: legacyAppCode,
        categoryId: input.categoryId?.trim() || null,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        coverImageUrl: input.coverImageUrl?.trim() || null,
        sampleMediaType,
        sampleMediaUrl,
        samplePosterUrl,
        templatePrompt: input.templatePrompt.trim(),
        tags: normalizedTags.join(", "),
        enabled: input.enabled ?? true,
        scopeMode,
      },
      include: PROMPT_TEMPLATE_ADMIN_INCLUDE,
    });

    if (scopeMode === PromptTemplateScopeMode.LIMITED && scopeAppCodes.length > 0) {
      await tx.promptTemplateAppScope.createMany({
        data: scopeAppCodes.map((appCode) => ({
          templateId: created.id,
          appCode,
        })),
      });

      return tx.promptTemplate.findUniqueOrThrow({
        where: { id: created.id },
        include: PROMPT_TEMPLATE_ADMIN_INCLUDE,
      });
    }

    return created;
  });

  return mapPromptTemplateAdmin(template);
}

export async function updatePromptTemplate(
  id: string,
  input: {
    appCode?: string | null;
    categoryId?: string | null;
    name?: string;
    description?: string | null;
    coverImageUrl?: string | null;
    sampleMediaType?: PromptTemplateMediaType;
    sampleMediaUrl?: string | null;
    samplePosterUrl?: string | null;
    templatePrompt?: string;
    tags?: string[] | string;
    enabled?: boolean;
    scopeMode?: PromptTemplateScopeMode;
    scopeAppCodes?: string[];
  },
) {
  const normalizedTags = input.tags === undefined ? undefined : normalizeTags(input.tags);
  const scopeAppCodes = input.scopeAppCodes
    ? Array.from(new Set(input.scopeAppCodes.filter(Boolean)))
    : undefined;

  const template = await prisma.$transaction(async (tx) => {
    const current = await tx.promptTemplate.findUnique({
      where: { id },
      include: PROMPT_TEMPLATE_ADMIN_INCLUDE,
    });

    if (!current) {
      throw new Error("模板不存在");
    }

    const nextScopeMode = input.scopeMode ?? current.scopeMode;
    const nextScopeAppCodes = scopeAppCodes ?? current.appScopes.map((scope) => scope.appCode);
    const nextLegacyAppCode =
      nextScopeMode === PromptTemplateScopeMode.LIMITED
        ? nextScopeAppCodes[0] ?? input.appCode?.trim() ?? current.appCode ?? null
        : input.appCode === undefined
        ? current.appCode
        : input.appCode?.trim() || null;

    const nextMediaType = input.sampleMediaType ?? current.sampleMediaType;
    const nextCoverImageUrl =
      input.coverImageUrl === undefined ? current.coverImageUrl : input.coverImageUrl?.trim() || null;
    const nextSampleMediaUrl =
      input.sampleMediaUrl === undefined
        ? current.sampleMediaUrl ?? nextCoverImageUrl
        : input.sampleMediaUrl?.trim() || nextCoverImageUrl;
    const nextSamplePosterUrl =
      nextMediaType === PromptTemplateMediaType.VIDEO
        ? input.samplePosterUrl === undefined
          ? current.samplePosterUrl ?? nextCoverImageUrl
          : input.samplePosterUrl?.trim() || nextCoverImageUrl
        : null;

    await tx.promptTemplate.update({
      where: { id },
      data: {
        ...(input.appCode !== undefined || input.scopeMode !== undefined || scopeAppCodes !== undefined
          ? { appCode: nextLegacyAppCode }
          : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId?.trim() || null } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.coverImageUrl !== undefined ? { coverImageUrl: nextCoverImageUrl } : {}),
        ...(input.sampleMediaType !== undefined ? { sampleMediaType: nextMediaType } : {}),
        ...(input.sampleMediaUrl !== undefined || input.coverImageUrl !== undefined
          ? { sampleMediaUrl: nextSampleMediaUrl }
          : {}),
        ...(input.samplePosterUrl !== undefined ||
        input.sampleMediaType !== undefined ||
        input.coverImageUrl !== undefined
          ? { samplePosterUrl: nextSamplePosterUrl }
          : {}),
        ...(input.templatePrompt !== undefined ? { templatePrompt: input.templatePrompt.trim() } : {}),
        ...(normalizedTags !== undefined ? { tags: normalizedTags.join(", ") } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.scopeMode !== undefined ? { scopeMode: nextScopeMode } : {}),
      },
    });

    if (input.scopeMode !== undefined || scopeAppCodes !== undefined) {
      await tx.promptTemplateAppScope.deleteMany({
        where: { templateId: id },
      });

      if (nextScopeMode === PromptTemplateScopeMode.LIMITED && nextScopeAppCodes.length > 0) {
        await tx.promptTemplateAppScope.createMany({
          data: nextScopeAppCodes.map((appCode) => ({
            templateId: id,
            appCode,
          })),
        });
      }
    }

    return tx.promptTemplate.findUniqueOrThrow({
      where: { id },
      include: PROMPT_TEMPLATE_ADMIN_INCLUDE,
    });
  });

  return mapPromptTemplateAdmin(template);
}

export async function deletePromptTemplate(id: string) {
  await prisma.promptTemplate.delete({
    where: { id },
  });
}

export async function bulkOperatePromptTemplates(input: {
  ids: string[];
  action: PromptTemplateBulkAction;
}): Promise<BulkOperationResult> {
  const results: Array<{ id: string; status: "success" | "skipped" | "failed"; message: string }> = [];

  for (const id of input.ids) {
    const current = await prisma.promptTemplate.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!current) {
      results.push({ id, status: "skipped", message: "模板不存在" });
      continue;
    }

    try {
      if (input.action.type === "delete") {
        await deletePromptTemplate(id);
        results.push({ id, status: "success", message: "模板已删除" });
        continue;
      }

      if (input.action.type === "setEnabled") {
        await updatePromptTemplate(id, { enabled: input.action.enabled });
        results.push({
          id,
          status: "success",
          message: input.action.enabled ? "模板已启用" : "模板已停用",
        });
        continue;
      }

      if (input.action.type === "setCategory") {
        await updatePromptTemplate(id, { categoryId: input.action.categoryId });
        results.push({ id, status: "success", message: "模板分类已更新" });
        continue;
      }

      if (input.action.type === "setTags") {
        await updatePromptTemplate(id, { tags: input.action.tags });
        results.push({ id, status: "success", message: "模板标签已更新" });
        continue;
      }

      if (input.action.type === "setScope") {
        await updatePromptTemplate(id, {
          scopeMode: input.action.scopeMode,
          scopeAppCodes: input.action.scopeAppCodes ?? [],
        });
        results.push({ id, status: "success", message: "模板适用范围已更新" });
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

export async function listUserPromptTemplates(input: {
  userId: string;
  appCode: string;
  mode?: "all" | "recent" | "favorites";
  tag?: string | null;
  category?: string | null;
  q?: string | null;
  sort?: "usage" | "latest";
}) {
  const filters: Prisma.PromptTemplateWhereInput[] = [
    { enabled: true },
    buildScopedTemplateWhere(input.appCode),
  ];

  if (input.tag) {
    filters.push({
      tags: {
        contains: input.tag,
      },
    });
  }

  if (input.category) {
    filters.push({
      categoryId: input.category,
    });
  }

  if (input.q) {
    filters.push({
      OR: [
        { name: { contains: input.q } },
        { description: { contains: input.q } },
        { tags: { contains: input.q } },
        { category: { name: { contains: input.q } } },
      ],
    });
  }

  if (input.mode === "favorites") {
    filters.push({
      favorites: { some: { userId: input.userId } },
    });
  }

  if (input.mode === "recent") {
    filters.push({
      recentUses: { some: { userId: input.userId } },
    });
  }

  const templates = await prisma.promptTemplate.findMany({
    where: {
      AND: filters,
    },
    select: {
      ...PROMPT_TEMPLATE_SAFE_SELECT,
      favorites: {
        where: { userId: input.userId },
        select: {
          userId: true,
        },
      },
      recentUses: {
        where: { userId: input.userId },
        orderBy: { lastUsedAt: "desc" },
        take: 1,
        select: {
          lastUsedAt: true,
        },
      },
    },
    orderBy:
      input.sort === "latest"
        ? [{ createdAt: "desc" }]
        : [{ usageCount: "desc" }, { createdAt: "desc" }],
  });

  const items = templates.map(mapPromptTemplateSafe);

  if (input.mode === "recent") {
    return items.sort((left, right) => (right.lastUsedAt ?? "").localeCompare(left.lastUsedAt ?? ""));
  }

  return items;
}

export async function togglePromptTemplateFavorite(input: {
  userId: string;
  templateId: string;
  favorite: boolean;
}) {
  if (input.favorite) {
    await prisma.promptTemplateFavorite.upsert({
      where: {
        userId_templateId: {
          userId: input.userId,
          templateId: input.templateId,
        },
      },
      update: {},
      create: {
        userId: input.userId,
        templateId: input.templateId,
      },
    });
  } else {
    await prisma.promptTemplateFavorite.deleteMany({
      where: {
        userId: input.userId,
        templateId: input.templateId,
      },
    });
  }
}

export async function resolvePromptTemplateForSubmit(input: {
  templateId: string;
  appCode: string;
}) {
  const template = await prisma.promptTemplate.findUnique({
    where: { id: input.templateId },
    include: PROMPT_TEMPLATE_ADMIN_INCLUDE,
  });

  if (!template || !template.enabled) {
    throw new Error("提示词模板不存在或已停用");
  }

  const isAllowed =
    template.scopeMode === PromptTemplateScopeMode.GLOBAL ||
    template.appScopes.some((scope) => scope.appCode === input.appCode) ||
    template.appCode === input.appCode;

  if (!isAllowed) {
    throw new Error("当前应用不可使用这个提示词模板");
  }

  return template;
}

export async function recordPromptTemplateUse(input: {
  templateId: string;
  userId: string;
}) {
  await prisma.$transaction([
    prisma.promptTemplate.update({
      where: { id: input.templateId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    }),
    prisma.promptTemplateRecentUse.upsert({
      where: {
        userId_templateId: {
          userId: input.userId,
          templateId: input.templateId,
        },
      },
      update: {
        lastUsedAt: new Date(),
      },
      create: {
        userId: input.userId,
        templateId: input.templateId,
        lastUsedAt: new Date(),
      },
    }),
  ]);
}
