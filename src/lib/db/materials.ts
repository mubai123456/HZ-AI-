import { prisma } from "@/lib/prisma";
import type {
  AdminMaterialClaimLogRecord,
  AdminMaterialItem,
  BulkMaterialAction,
  BulkMaterialOperationResult,
  ClaimStatus,
  MaterialHallItem,
  MaterialHallTagSummary,
  MaterialQuotaRecord,
  MaterialTagRecord,
  MaterialStatus,
  MaterialType,
  MyClaimedMaterialRecord,
  PublishLinkRecord,
  VariantKind,
} from "@/lib/types";

export type ClaimMaterialResult =
  | {
      ok: true;
      idempotent: boolean;
      claim: {
        id: string;
        materialId: string;
        status: ClaimStatus;
        signedUrlIssuedAt: string | null;
        signedUrlExpireAt: string | null;
      };
      download: {
        claimId: string;
        url: string;
        expiresAt: string;
      } | null;
    }
  | {
      ok: false;
      error:
        | "material_not_found"
        | "already_claimed"
        | "quota_exceeded"
        | "user_unavailable"
        | "material_not_available";
    };

function startOfDay(input = new Date()) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateTime(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getMaterialTypeLabel(materialType: MaterialType) {
  return materialType === "VIDEO" ? "视频" : "图片";
}

function getMaterialStatusLabel(status: MaterialStatus) {
  switch (status) {
    case "UPLOADING":
      return "上传中";
    case "PROCESSING":
      return "处理中";
    case "AVAILABLE":
      return "可领取";
    case "CLAIMED":
      return "已领取";
    case "OFF_SHELF":
      return "已下架";
    case "ARCHIVED":
      return "已归档";
    default:
      return status;
  }
}

function getClaimStatusLabel(status: ClaimStatus) {
  switch (status) {
    case "ACTIVE":
      return "已领取";
    case "RESET_BY_ADMIN":
      return "已重置";
    case "DELIVERY_FAILED":
      return "发放失败";
    default:
      return status;
  }
}

function mapPublishLinks(
  links: Array<{
    id: string;
    url: string;
    platform: string | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
): PublishLinkRecord[] {
  return links.map((item) => ({
    id: item.id,
    url: item.url,
    platform: item.platform,
    note: item.note,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));
}

function getPreviewVariant(
  variants: Array<{
    kind: VariantKind;
    bucket: string;
    objectKey: string;
    mimeType: string | null;
  }>,
) {
  return (
    variants.find((variant) => variant.kind === "PREVIEW_WATERMARK") ??
    variants.find((variant) => variant.kind === "POSTER") ??
    variants.find((variant) => variant.kind === "THUMBNAIL") ??
    variants.find((variant) => variant.kind === "ORIGINAL") ??
    null
  );
}

function getOriginalVariant(
  variants: Array<{
    kind: VariantKind;
    bucket: string;
    objectKey: string;
    mimeType: string | null;
  }>,
) {
  return variants.find((variant) => variant.kind === "ORIGINAL") ?? null;
}

function buildMaterialCard(material: {
  id: string;
  title: string;
  description: string | null;
  materialType: MaterialType;
  status: MaterialStatus;
  previewReady: boolean;
  batchNo: string | null;
  sourceFilename: string;
  fileSizeBytes: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
  tags: Array<{ tag: { name: string } }>;
  variants: Array<{ kind: VariantKind; bucket: string; objectKey: string; mimeType: string | null }>;
}): MaterialHallItem {
  return {
    id: material.id,
    title: material.title,
    description: material.description,
    materialType: material.materialType,
    materialTypeLabel: getMaterialTypeLabel(material.materialType),
    status: material.status,
    statusLabel: getMaterialStatusLabel(material.status),
    previewReady: material.previewReady,
    batchNo: material.batchNo,
    tags: material.tags.map((item) => item.tag.name),
    sourceFilename: material.sourceFilename,
    fileSizeBytes: material.fileSizeBytes,
    durationMs: material.durationMs,
    width: material.width,
    height: material.height,
    createdAt: material.createdAt.toISOString(),
    previewUrl: `/api/internal/materials/${material.id}/preview`,
    posterUrl: `/api/internal/materials/${material.id}/preview`,
    downloadUrl: null,
  };
}

function normalizeTagNames(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

async function writeAuditLog(input: {
  actorId?: string | null;
  materialId?: string | null;
  claimId?: string | null;
  action: "UPLOAD" | "COMPLETE" | "CLAIM" | "RESET" | "OFF_SHELF" | "QUOTA_CHANGE";
  payloadJson?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      materialId: input.materialId ?? null,
      claimId: input.claimId ?? null,
      action: input.action,
      payloadJson: input.payloadJson ?? undefined,
    },
  });
}

export async function findMaterialByChecksum(checksumSha256: string) {
  return prisma.material.findUnique({
    where: { checksumSha256 },
    include: {
      tags: { include: { tag: true } },
      variants: true,
      createdBy: { select: { displayName: true } },
      exclusiveOwner: { select: { displayName: true } },
      claims: {
        where: { status: "ACTIVE" },
        select: { id: true },
        take: 1,
      },
      _count: {
        select: { claims: true },
      },
    },
  });
}

export async function getMaterialTags(): Promise<MaterialTagRecord[]> {
  const tags = await prisma.materialTag.findMany({
    orderBy: [{ name: "asc" }],
  });

  return tags.map((item) => ({
    id: item.id,
    name: item.name,
    color: item.color,
  }));
}

export async function createMaterialTag(name: string): Promise<MaterialTagRecord> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("标签名称不能为空。");
  }

  const tag = await prisma.materialTag.upsert({
    where: { name: normalizedName },
    update: {},
    create: { name: normalizedName },
  });

  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
  };
}

export async function updateMaterialTag(input: {
  tagId: string;
  name: string;
}): Promise<MaterialTagRecord> {
  const normalizedName = input.name.trim();
  if (!normalizedName) {
    throw new Error("标签名称不能为空。");
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.materialTag.findUnique({
      where: { id: input.tagId },
    });

    if (!current) {
      throw new Error("未找到对应标签。");
    }

    const existing = await tx.materialTag.findUnique({
      where: { name: normalizedName },
    });

    if (existing && existing.id !== input.tagId) {
      const links = await tx.materialTagLink.findMany({
        where: { tagId: input.tagId },
      });

      for (const link of links) {
        await tx.materialTagLink.upsert({
          where: {
            materialId_tagId: {
              materialId: link.materialId,
              tagId: existing.id,
            },
          },
          update: {},
          create: {
            materialId: link.materialId,
            tagId: existing.id,
          },
        });
      }

      await tx.materialTag.delete({
        where: { id: input.tagId },
      });

      return {
        id: existing.id,
        name: existing.name,
        color: existing.color,
      };
    }

    const updated = await tx.materialTag.update({
      where: { id: input.tagId },
      data: { name: normalizedName },
    });

    return {
      id: updated.id,
      name: updated.name,
      color: updated.color,
    };
  });
}

export async function deleteMaterialTag(input: { tagId: string }) {
  const deleted = await prisma.materialTag.deleteMany({
    where: { id: input.tagId },
  });

  return {
    ok: deleted.count > 0,
  };
}

export async function getUserMaterialQuota(userId: string): Promise<MaterialQuotaRecord> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyClaimLimit: true },
  });

  const quotaDate = startOfDay();
  const quota = await prisma.userDailyQuota.findUnique({
    where: {
      userId_quotaDate: {
        userId,
        quotaDate,
      },
    },
  });

  const limitCount = quota?.limitSnapshot ?? user?.dailyClaimLimit ?? 0;
  const usedCount = quota?.usedCount ?? 0;

  return {
    quotaDate: quotaDate.toISOString(),
    limitCount,
    usedCount,
    remainingCount: Math.max(limitCount - usedCount, 0),
  };
}

async function issueDownloadWithinTx(
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">,
  materialId: string,
  claimId: string,
) {
  const issuedAt = new Date();
  const expireAt = new Date(issuedAt.getTime() + 10 * 60 * 1000);

  await tx.materialClaim.update({
    where: { id: claimId },
    data: {
      signedUrlIssuedAt: issuedAt,
      signedUrlExpireAt: expireAt,
    },
  });

  return {
    claimId,
    url: `/api/internal/materials/${materialId}/download/file?ts=${issuedAt.getTime()}`,
    expiresAt: expireAt.toISOString(),
  };
}

export async function claimMaterialForUser(input: {
  materialId: string;
  userId: string;
  claimRequestId?: string | null;
}): Promise<ClaimMaterialResult> {
  const quotaDate = startOfDay();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, active: true, dailyClaimLimit: true },
    });

    if (!user || !user.active) {
      return { ok: false, error: "user_unavailable" } as const;
    }

    if (input.claimRequestId) {
      const existingByRequestId = await tx.materialClaim.findUnique({
        where: { claimRequestId: input.claimRequestId },
      });

      if (existingByRequestId && existingByRequestId.userId === input.userId) {
        return {
          ok: true,
          idempotent: true,
          claim: {
            id: existingByRequestId.id,
            materialId: existingByRequestId.materialId,
            status: existingByRequestId.status,
            signedUrlIssuedAt: formatDateTime(existingByRequestId.signedUrlIssuedAt),
            signedUrlExpireAt: formatDateTime(existingByRequestId.signedUrlExpireAt),
          },
          download: await issueDownloadWithinTx(tx, existingByRequestId.materialId, existingByRequestId.id),
        } as const;
      }
    }

    const existingClaim = await tx.materialClaim.findFirst({
      where: {
        materialId: input.materialId,
        userId: input.userId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingClaim) {
      return {
        ok: true,
        idempotent: true,
        claim: {
          id: existingClaim.id,
          materialId: existingClaim.materialId,
          status: existingClaim.status,
          signedUrlIssuedAt: formatDateTime(existingClaim.signedUrlIssuedAt),
          signedUrlExpireAt: formatDateTime(existingClaim.signedUrlExpireAt),
        },
        download: await issueDownloadWithinTx(tx, existingClaim.materialId, existingClaim.id),
      } as const;
    }

    const material = await tx.material.findUnique({
      where: { id: input.materialId },
      select: { id: true, status: true, deletedAt: true },
    });

    if (!material || material.deletedAt) {
      return { ok: false, error: "material_not_found" } as const;
    }

    if (material.status !== "AVAILABLE") {
      const activeClaim = await tx.materialClaim.findFirst({
        where: { materialId: input.materialId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });

      if (activeClaim?.userId === input.userId) {
        return {
          ok: true,
          idempotent: true,
          claim: {
            id: activeClaim.id,
            materialId: activeClaim.materialId,
            status: activeClaim.status,
            signedUrlIssuedAt: formatDateTime(activeClaim.signedUrlIssuedAt),
            signedUrlExpireAt: formatDateTime(activeClaim.signedUrlExpireAt),
          },
          download: await issueDownloadWithinTx(tx, activeClaim.materialId, activeClaim.id),
        } as const;
      }

      return {
        ok: false,
        error: activeClaim ? "already_claimed" : "material_not_available",
      } as const;
    }

    const quota = await tx.userDailyQuota.upsert({
      where: {
        userId_quotaDate: {
          userId: input.userId,
          quotaDate,
        },
      },
      create: {
        userId: input.userId,
        quotaDate,
        limitSnapshot: user.dailyClaimLimit,
        usedCount: 0,
      },
      update: {
        limitSnapshot: user.dailyClaimLimit,
      },
    });

    if (quota.usedCount >= quota.limitSnapshot) {
      return { ok: false, error: "quota_exceeded" } as const;
    }

    const claimedMaterial = await tx.material.updateMany({
      where: {
        id: input.materialId,
        status: "AVAILABLE",
        deletedAt: null,
      },
      data: {
        status: "CLAIMED",
        exclusiveOwnerId: input.userId,
        claimedAt: now,
      },
    });

    if (claimedMaterial.count === 0) {
      return { ok: false, error: "already_claimed" } as const;
    }

    const claim = await tx.materialClaim.create({
      data: {
        materialId: input.materialId,
        userId: input.userId,
        claimRequestId: input.claimRequestId ?? null,
      },
    });

    await tx.userDailyQuota.update({
      where: {
        userId_quotaDate: {
          userId: input.userId,
          quotaDate,
        },
      },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.userId,
        materialId: input.materialId,
        claimId: claim.id,
        action: "CLAIM",
        payloadJson: { claimRequestId: input.claimRequestId ?? null },
      },
    });

    return {
      ok: true,
      idempotent: false,
      claim: {
        id: claim.id,
        materialId: claim.materialId,
        status: claim.status,
        signedUrlIssuedAt: formatDateTime(claim.signedUrlIssuedAt),
        signedUrlExpireAt: formatDateTime(claim.signedUrlExpireAt),
      },
      download: await issueDownloadWithinTx(tx, claim.materialId, claim.id),
    } as const;
  });
}

export async function resetClaimedMaterialByAdmin(input: {
  materialId: string;
  adminUserId: string;
  reason?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const material = await tx.material.findUnique({
      where: { id: input.materialId },
      include: {
        claims: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!material) {
      return { ok: false as const, error: "material_not_found" };
    }

    const activeClaim = material.claims[0];
    if (!activeClaim) {
      return { ok: false as const, error: "material_not_available" };
    }

    await tx.materialClaim.update({
      where: { id: activeClaim.id },
      data: {
        status: "RESET_BY_ADMIN",
        resetById: input.adminUserId,
        resetReason: input.reason ?? null,
      },
    });

    const claimedDay = startOfDay(activeClaim.createdAt);
    await tx.userDailyQuota.updateMany({
      where: {
        userId: activeClaim.userId,
        quotaDate: claimedDay,
        usedCount: { gt: 0 },
      },
      data: {
        usedCount: {
          decrement: 1,
        },
      },
    });

    await tx.material.update({
      where: { id: input.materialId },
      data: {
        status: "AVAILABLE",
        exclusiveOwnerId: null,
        claimedAt: null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.adminUserId,
        materialId: input.materialId,
        claimId: activeClaim.id,
        action: "RESET",
        payloadJson: { reason: input.reason ?? null },
      },
    });

    return { ok: true as const };
  });
}

export async function getAvailableMaterials(input?: {
  search?: string;
  materialType?: MaterialType | "ALL";
  tag?: string;
}) {
  const search = input?.search?.trim();
  const materialType = input?.materialType && input.materialType !== "ALL" ? input.materialType : undefined;
  const tag = input?.tag?.trim();

  const items = await prisma.material.findMany({
    where: {
      status: "AVAILABLE",
      deletedAt: null,
      ...(materialType ? { materialType } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { description: { contains: search } },
              { sourceFilename: { contains: search } },
            ],
          }
        : {}),
      ...(tag
        ? {
            tags: {
              some: {
                tag: { name: tag },
              },
            },
          }
        : {}),
    },
    include: {
      tags: { include: { tag: true } },
      variants: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return items.map(buildMaterialCard);
}

export async function getAvailableMaterialTags(input?: {
  materialType?: MaterialType | "ALL";
}): Promise<MaterialHallTagSummary[]> {
  const materialType = input?.materialType && input.materialType !== "ALL" ? input.materialType : undefined;

  const links = await prisma.materialTagLink.findMany({
    where: {
      material: {
        status: "AVAILABLE",
        deletedAt: null,
        ...(materialType ? { materialType } : {}),
      },
    },
    include: {
      tag: { select: { name: true } },
    },
  });

  const counts = new Map<string, number>();
  for (const link of links) {
    counts.set(link.tag.name, (counts.get(link.tag.name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "zh-CN"));
}

export async function getMyClaimedMaterials(userId: string): Promise<MyClaimedMaterialRecord[]> {
  const claims = await prisma.materialClaim.findMany({
    where: { userId },
    include: {
      material: {
        include: {
          tags: { include: { tag: true } },
          variants: true,
        },
      },
      publishLinks: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return claims.map((claim) => {
    const materialCard = buildMaterialCard(claim.material);

    return {
      ...materialCard,
      claimId: claim.id,
      claimStatus: claim.status,
      claimStatusLabel: getClaimStatusLabel(claim.status),
      claimCreatedAt: claim.createdAt.toISOString(),
      signedUrlIssuedAt: formatDateTime(claim.signedUrlIssuedAt),
      signedUrlExpireAt: formatDateTime(claim.signedUrlExpireAt),
      downloadUrl:
        claim.status === "ACTIVE"
          ? `/api/internal/materials/${claim.materialId}/download/file?ts=${claim.createdAt.getTime()}`
          : null,
      resetReason: claim.resetReason,
      publishLinks: mapPublishLinks(claim.publishLinks),
    };
  });
}

export async function getAdminMaterials() {
  const materials = await prisma.material.findMany({
    where: { deletedAt: null },
    include: {
      tags: { include: { tag: true } },
      variants: true,
      claims: {
        where: { status: "ACTIVE" },
        select: { id: true },
        take: 1,
      },
      createdBy: {
        select: { displayName: true },
      },
      exclusiveOwner: {
        select: { displayName: true },
      },
      _count: {
        select: { claims: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return materials.map((material) => ({
    ...buildMaterialCard(material),
    exclusiveOwnerName: material.exclusiveOwner?.displayName ?? null,
    claimCount: material._count.claims,
    activeClaimId: material.claims[0]?.id ?? null,
    uploaderName: material.createdBy?.displayName ?? null,
  })) satisfies AdminMaterialItem[];
}

export async function getAdminMaterialClaimLogs(): Promise<AdminMaterialClaimLogRecord[]> {
  const logs = await prisma.materialClaim.findMany({
    include: {
      material: { select: { id: true, title: true } },
      user: { select: { id: true, username: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return logs.map((log) => ({
    id: log.id,
    materialId: log.materialId,
    materialTitle: log.material.title,
    ownerId: log.user.id,
    username: log.user.username,
    displayName: log.user.displayName,
    status: log.status,
    createdAt: log.createdAt.toISOString(),
    resetReason: log.resetReason,
  }));
}

export async function createMaterialEntry(input: {
  title: string;
  description?: string | null;
  materialType: MaterialType;
  sourceFilename: string;
  checksumSha256: string;
  bucket: string;
  objectKey: string;
  fileSizeBytes: number;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  batchNo?: string | null;
  previewReady?: boolean;
  createdById: string;
  tags?: string[];
  variants?: Array<{
    kind: VariantKind;
    bucket: string;
    objectKey: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    width?: number | null;
    height?: number | null;
    durationMs?: number | null;
  }>;
}) {
  const tags = normalizeTagNames(input.tags ?? []);
  const variants =
    input.variants && input.variants.length > 0
      ? input.variants
      : [
          {
            kind: "ORIGINAL" as const,
            bucket: input.bucket,
            objectKey: input.objectKey,
            mimeType: input.mimeType ?? null,
            fileSizeBytes: input.fileSizeBytes,
            width: input.width ?? null,
            height: input.height ?? null,
            durationMs: input.durationMs ?? null,
          },
        ];

  const material = await prisma.material.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      materialType: input.materialType,
      status: input.previewReady ? "AVAILABLE" : "PROCESSING",
      sourceFilename: input.sourceFilename,
      checksumSha256: input.checksumSha256,
      bucket: input.bucket,
      objectKey: input.objectKey,
      fileSizeBytes: input.fileSizeBytes,
      mimeType: input.mimeType ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      durationMs: input.durationMs ?? null,
      previewReady: input.previewReady ?? false,
      batchNo: input.batchNo ?? null,
      createdById: input.createdById,
      variants: {
        create: variants.map((variant) => ({
          kind: variant.kind,
          bucket: variant.bucket,
          objectKey: variant.objectKey,
          mimeType: variant.mimeType ?? null,
          fileSizeBytes: variant.fileSizeBytes ?? null,
          width: variant.width ?? null,
          height: variant.height ?? null,
          durationMs: variant.durationMs ?? null,
        })),
      },
      tags: {
        create: tags.map((tag) => ({
          tag: {
            connectOrCreate: {
              where: { name: tag },
              create: { name: tag },
            },
          },
        })),
      },
    },
    include: {
      tags: { include: { tag: true } },
      variants: true,
    },
  });

  await writeAuditLog({
    actorId: input.createdById,
    materialId: material.id,
    action: "UPLOAD",
    payloadJson: {
      batchNo: input.batchNo ?? null,
      materialType: input.materialType,
    },
  });

  return buildMaterialCard(material);
}

export async function updateMaterialEntry(input: {
  materialId: string;
  actorId: string;
  title?: string;
  description?: string | null;
  status?: MaterialStatus;
  previewReady?: boolean;
  batchNo?: string | null;
  tags?: string[];
}) {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.status !== undefined) updates.status = input.status;
  if (input.previewReady !== undefined) updates.previewReady = input.previewReady;
  if (input.batchNo !== undefined) updates.batchNo = input.batchNo;

  await prisma.$transaction(async (tx) => {
    await tx.material.update({
      where: { id: input.materialId },
      data: updates,
    });

    if (input.tags) {
      await tx.materialTagLink.deleteMany({
        where: { materialId: input.materialId },
      });

      const tags = normalizeTagNames(input.tags);
      for (const tag of tags) {
        const tagRecord = await tx.materialTag.upsert({
          where: { name: tag },
          update: {},
          create: { name: tag },
        });

        await tx.materialTagLink.create({
          data: {
            materialId: input.materialId,
            tagId: tagRecord.id,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        materialId: input.materialId,
        action: input.status === "OFF_SHELF" ? "OFF_SHELF" : "COMPLETE",
        payloadJson: {
          title: input.title,
          description: input.description,
          status: input.status,
          previewReady: input.previewReady,
          batchNo: input.batchNo,
          tags: input.tags ?? null,
        },
      },
    });
  });
}

export async function softDeleteMaterial(input: {
  materialId: string;
  actorId: string;
}) {
  const deletedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.material.update({
      where: { id: input.materialId },
      data: {
        deletedAt,
        status: "ARCHIVED",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        materialId: input.materialId,
        action: "OFF_SHELF",
        payloadJson: {
          softDeleted: true,
          deletedAt: deletedAt.toISOString(),
        },
      },
    });
  });
}

export async function bulkOperateMaterials(input: {
  actorId: string;
  materialIds: string[];
  action: BulkMaterialAction;
}): Promise<BulkMaterialOperationResult> {
  const materialIds = Array.from(new Set(input.materialIds.map((item) => item.trim()).filter(Boolean)));
  const items: BulkMaterialOperationResult["items"] = [];

  for (const materialId of materialIds) {
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        claims: {
          where: { status: "ACTIVE" },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!material || material.deletedAt) {
      items.push({
        materialId,
        status: "failed",
        message: "素材不存在或已删除。",
      });
      continue;
    }

    try {
      if (input.action.type === "updateTags") {
        await updateMaterialEntry({
          materialId,
          actorId: input.actorId,
          tags: normalizeTagNames(input.action.tags),
        });
        items.push({
          materialId,
          status: "success",
          message: "标签已更新。",
        });
        continue;
      }

      if (input.action.type === "changeStatus") {
        await updateMaterialEntry({
          materialId,
          actorId: input.actorId,
          status: input.action.status,
        });
        items.push({
          materialId,
          status: "success",
          message: input.action.status === "AVAILABLE" ? "素材已上架。" : "素材已下架。",
        });
        continue;
      }

      if (input.action.type === "delete") {
        await softDeleteMaterial({
          materialId,
          actorId: input.actorId,
        });
        items.push({
          materialId,
          status: "success",
          message: "素材已删除。",
        });
        continue;
      }

      if (material.claims.length === 0) {
        items.push({
          materialId,
          status: "skipped",
          message: "素材当前未被领取，已跳过。",
        });
        continue;
      }

      const resetResult = await resetClaimedMaterialByAdmin({
        materialId,
        adminUserId: input.actorId,
        reason: input.action.reason,
      });

      if (resetResult.ok) {
        items.push({
          materialId,
          status: "success",
          message: "素材已重置回公海。",
        });
      } else {
        items.push({
          materialId,
          status: "failed",
          message: "素材当前无法重置。",
        });
      }
    } catch (error) {
      items.push({
        materialId,
        status: "failed",
        message: error instanceof Error ? error.message : "批量操作失败。",
      });
    }
  }

  return {
    items,
    summary: {
      totalCount: materialIds.length,
      successCount: items.filter((item) => item.status === "success").length,
      skippedCount: items.filter((item) => item.status === "skipped").length,
      failureCount: items.filter((item) => item.status === "failed").length,
    },
  };
}

export async function updateUserDailyClaimLimit(input: {
  userId: string;
  limit: number;
  operatorId: string;
}) {
  const user = await prisma.user.update({
    where: { id: input.userId },
    data: {
      dailyClaimLimit: input.limit,
    },
  });

  await writeAuditLog({
    actorId: input.operatorId,
    action: "QUOTA_CHANGE",
    payloadJson: {
      userId: input.userId,
      limit: input.limit,
    },
  });

  return user;
}

export async function getMaterialPreviewForUser(input: {
  materialId: string;
  userId: string;
  role: "USER" | "ADMIN";
}) {
  const material = await prisma.material.findUnique({
    where: { id: input.materialId },
    include: { variants: true },
  });

  if (!material || material.deletedAt) {
    return null;
  }

  if (material.status !== "AVAILABLE" && material.exclusiveOwnerId !== input.userId && input.role !== "ADMIN") {
    return null;
  }

  const previewVariant = getPreviewVariant(material.variants);
  if (!previewVariant) {
    return null;
  }

  return {
    materialId: material.id,
    sourceFilename: material.sourceFilename,
    bucket: previewVariant.bucket,
    objectKey: previewVariant.objectKey,
    mimeType: previewVariant.mimeType,
  };
}

export async function issueDownloadForMaterial(input: {
  materialId: string;
  userId: string;
  role: "USER" | "ADMIN";
}) {
  const claim = await prisma.materialClaim.findFirst({
    where: {
      materialId: input.materialId,
      ...(input.role === "ADMIN" ? {} : { userId: input.userId, status: "ACTIVE" }),
    },
    include: {
      material: {
        include: {
          variants: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!claim) {
    return null;
  }

  const original = getOriginalVariant(claim.material.variants);
  if (!original) {
    return null;
  }

  const issuedAt = new Date();
  const expireAt = new Date(issuedAt.getTime() + 10 * 60 * 1000);

  await prisma.materialClaim.update({
    where: { id: claim.id },
    data: {
      signedUrlIssuedAt: issuedAt,
      signedUrlExpireAt: expireAt,
    },
  });

  return {
    claimId: claim.id,
    url: `/api/internal/materials/${input.materialId}/download/file?ts=${issuedAt.getTime()}`,
    expiresAt: expireAt.toISOString(),
  };
}

export async function getDownloadSourceForUser(input: {
  materialId: string;
  userId: string;
  role: "USER" | "ADMIN";
}) {
  const claim = await prisma.materialClaim.findFirst({
    where: {
      materialId: input.materialId,
      ...(input.role === "ADMIN" ? {} : { userId: input.userId, status: "ACTIVE" }),
    },
    include: {
      material: {
        include: {
          variants: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!claim) {
    return null;
  }

  const original = getOriginalVariant(claim.material.variants);
  if (!original) {
    return null;
  }

  return {
    sourceFilename: claim.material.sourceFilename,
    bucket: original.bucket,
    objectKey: original.objectKey,
    mimeType: original.mimeType,
  };
}

export async function addPublishLinkForClaim(input: {
  claimId: string;
  userId: string;
  url: string;
  platform?: string | null;
  note?: string | null;
}) {
  const claim = await prisma.materialClaim.findFirst({
    where: {
      id: input.claimId,
      userId: input.userId,
    },
  });

  if (!claim) {
    return null;
  }

  const link = await prisma.materialPublishLink.create({
    data: {
      claimId: input.claimId,
      url: input.url,
      platform: input.platform ?? null,
      note: input.note ?? null,
    },
  });

  return {
    id: link.id,
    url: link.url,
    platform: link.platform,
    note: link.note,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  } satisfies PublishLinkRecord;
}

export async function deletePublishLinkForClaim(input: {
  claimId: string;
  linkId: string;
  userId: string;
}) {
  const claim = await prisma.materialClaim.findFirst({
    where: {
      id: input.claimId,
      userId: input.userId,
    },
    select: { id: true },
  });

  if (!claim) {
    return false;
  }

  const deleted = await prisma.materialPublishLink.deleteMany({
    where: {
      id: input.linkId,
      claimId: input.claimId,
    },
  });

  return deleted.count > 0;
}
