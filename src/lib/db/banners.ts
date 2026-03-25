import { prisma } from "@/lib/prisma";
import { buildBulkOperationResult } from "@/lib/db/bulk";
import type {
  AppBannerBulkAction,
  AppBannerRecord,
  BulkOperationResult,
} from "@/lib/types";

export type AppBannerItem = AppBannerRecord;

function mapBanner(banner: {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  bgFrom: string;
  bgTo: string;
  sortOrder: number;
  enabled: boolean;
}): AppBannerRecord {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    imageUrl: banner.imageUrl,
    linkUrl: banner.linkUrl,
    linkLabel: banner.linkLabel,
    bgFrom: banner.bgFrom,
    bgTo: banner.bgTo,
    sortOrder: banner.sortOrder,
    enabled: banner.enabled,
  };
}

export async function getEnabledBanners(): Promise<AppBannerItem[]> {
  const banners = await prisma.appBanner.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      subtitle: true,
      imageUrl: true,
      linkUrl: true,
      linkLabel: true,
      bgFrom: true,
      bgTo: true,
      sortOrder: true,
      enabled: true,
    },
  });

  return banners.map(mapBanner);
}

export async function getAllBanners(): Promise<AppBannerItem[]> {
  const banners = await prisma.appBanner.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      subtitle: true,
      imageUrl: true,
      linkUrl: true,
      linkLabel: true,
      bgFrom: true,
      bgTo: true,
      sortOrder: true,
      enabled: true,
    },
  });

  return banners.map(mapBanner);
}

export async function createBanner(input: {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  bgFrom?: string;
  bgTo?: string;
  sortOrder?: number;
  enabled?: boolean;
}) {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Banner 标题不能为空");
  }

  const banner = await prisma.appBanner.create({
    data: {
      title,
      subtitle: input.subtitle?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      linkUrl: input.linkUrl?.trim() || null,
      linkLabel: input.linkLabel?.trim() || null,
      bgFrom: input.bgFrom ?? "#EFF6FF",
      bgTo: input.bgTo ?? "#EDE9FE",
      sortOrder: input.sortOrder ?? 0,
      enabled: input.enabled ?? true,
    },
  });

  return mapBanner(banner);
}

export async function updateBanner(
  id: string,
  input: {
    title?: string;
    subtitle?: string | null;
    imageUrl?: string | null;
    linkUrl?: string | null;
    linkLabel?: string | null;
    bgFrom?: string;
    bgTo?: string;
    sortOrder?: number;
    enabled?: boolean;
  },
) {
  const current = await prisma.appBanner.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error("Banner 不存在");
  }

  const banner = await prisma.appBanner.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle?.trim() || null } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl?.trim() || null } : {}),
      ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl?.trim() || null } : {}),
      ...(input.linkLabel !== undefined ? { linkLabel: input.linkLabel?.trim() || null } : {}),
      ...(input.bgFrom !== undefined ? { bgFrom: input.bgFrom } : {}),
      ...(input.bgTo !== undefined ? { bgTo: input.bgTo } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    },
  });

  return mapBanner(banner);
}

export async function deleteBanner(id: string) {
  const current = await prisma.appBanner.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error("Banner 不存在");
  }

  await prisma.appBanner.delete({
    where: { id },
  });
}

export async function bulkOperateBanners(input: {
  ids: string[];
  action: AppBannerBulkAction;
}): Promise<BulkOperationResult> {
  const results: Array<{ id: string; status: "success" | "skipped" | "failed"; message: string }> = [];

  for (const [index, id] of input.ids.entries()) {
    const current = await prisma.appBanner.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!current) {
      results.push({ id, status: "skipped", message: "Banner 不存在" });
      continue;
    }

    try {
      if (input.action.type === "setEnabled") {
        await updateBanner(id, { enabled: input.action.enabled });
        results.push({ id, status: "success", message: input.action.enabled ? "Banner 已启用" : "Banner 已停用" });
      } else if (input.action.type === "setSortOrder") {
        await updateBanner(id, { sortOrder: input.action.startSortOrder + index });
        results.push({ id, status: "success", message: "Banner 排序已更新" });
      } else if (input.action.type === "delete") {
        await deleteBanner(id);
        results.push({ id, status: "success", message: "Banner 已删除" });
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
