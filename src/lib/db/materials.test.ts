import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  addPublishLinkForClaim,
  bulkOperateMaterials,
  claimMaterialForUser,
  createMaterialTag,
  deleteMaterialTag,
  deletePublishLinkForClaim,
  getAvailableMaterialTags,
  getMyClaimedMaterials,
  getUserMaterialQuota,
  resetClaimedMaterialByAdmin,
  updateMaterialTag,
} from "@/lib/db/materials";

async function ensureUser(params: {
  username: string;
  displayName: string;
  role?: "USER" | "ADMIN";
  dailyClaimLimit?: number;
}) {
  return prisma.user.upsert({
    where: { username: params.username },
    update: {
      displayName: params.displayName,
      role: params.role ?? "USER",
      active: true,
      dailyClaimLimit: params.dailyClaimLimit ?? 3,
    },
    create: {
      username: params.username,
      displayName: params.displayName,
      role: params.role ?? "USER",
      active: true,
      dailyClaimLimit: params.dailyClaimLimit ?? 3,
    },
  });
}

async function createMaterial(createdById: string, suffix: string) {
  return prisma.material.create({
    data: {
      title: `素材-${suffix}`,
      description: "独家领取测试素材",
      materialType: "VIDEO",
      status: "AVAILABLE",
      sourceFilename: `video-${suffix}.mp4`,
      checksumSha256: `sha256-${suffix}`,
      bucket: "local-private",
      objectKey: `materials/original/video-${suffix}.mp4`,
      fileSizeBytes: 1024 * 1024,
      mimeType: "video/mp4",
      width: 1080,
      height: 1920,
      durationMs: 15000,
      previewReady: true,
      createdById,
      variants: {
        create: [
          {
            kind: "ORIGINAL",
            bucket: "local-private",
            objectKey: `materials/original/video-${suffix}.mp4`,
            mimeType: "video/mp4",
            fileSizeBytes: 1024 * 1024,
            width: 1080,
            height: 1920,
            durationMs: 15000,
          },
        ],
      },
    },
  });
}

async function attachTags(materialId: string, tagNames: string[]) {
  for (const tagName of tagNames) {
    const tag = await prisma.materialTag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });

    await prisma.materialTagLink.create({
      data: {
        materialId,
        tagId: tag.id,
      },
    });
  }
}

describe("素材独家领取流程", () => {
  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.materialPublishLink.deleteMany();
    await prisma.materialClaim.deleteMany();
    await prisma.materialTagLink.deleteMany();
    await prisma.materialVariant.deleteMany();
    await prisma.material.deleteMany();
    await prisma.userDailyQuota.deleteMany();
    await prisma.user.deleteMany({
      where: {
        username: {
          in: ["materials-admin", "materials-user-a", "materials-user-b"],
        },
      },
    });
  });

  it("同一条素材只能成功领取一次，并扣减一次额度", async () => {
    const admin = await ensureUser({
      username: "materials-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const user = await ensureUser({
      username: "materials-user-a",
      displayName: "用户A",
      dailyClaimLimit: 2,
    });
    const material = await createMaterial(admin.id, "claim-once");

    const result = await claimMaterialForUser({
      materialId: material.id,
      userId: user.id,
      claimRequestId: "req-claim-once",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const reloaded = await prisma.material.findUniqueOrThrow({
      where: { id: material.id },
    });
    const quota = await getUserMaterialQuota(user.id);
    const mine = await getMyClaimedMaterials(user.id);

    expect(reloaded.status).toBe("CLAIMED");
    expect(reloaded.exclusiveOwnerId).toBe(user.id);
    expect(quota.usedCount).toBe(1);
    expect(quota.remainingCount).toBe(1);
    expect(mine).toHaveLength(1);
    expect(mine[0]?.claimStatus).toBe("ACTIVE");
  });

  it("同一用户重复点击不会重复扣减额度", async () => {
    const admin = await ensureUser({
      username: "materials-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const user = await ensureUser({
      username: "materials-user-a",
      displayName: "用户A",
      dailyClaimLimit: 1,
    });
    const material = await createMaterial(admin.id, "idempotent");

    const first = await claimMaterialForUser({
      materialId: material.id,
      userId: user.id,
      claimRequestId: "req-idempotent",
    });
    const second = await claimMaterialForUser({
      materialId: material.id,
      userId: user.id,
      claimRequestId: "req-idempotent",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    const quota = await getUserMaterialQuota(user.id);
    const claims = await prisma.materialClaim.findMany({
      where: { materialId: material.id, userId: user.id },
    });

    expect(quota.usedCount).toBe(1);
    expect(claims).toHaveLength(1);
    expect(second.claim.id).toBe(first.claim.id);
  });

  it("管理员可以把已领取素材重置回公海", async () => {
    const admin = await ensureUser({
      username: "materials-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const userA = await ensureUser({
      username: "materials-user-a",
      displayName: "用户A",
      dailyClaimLimit: 1,
    });
    const userB = await ensureUser({
      username: "materials-user-b",
      displayName: "用户B",
      dailyClaimLimit: 1,
    });
    const material = await createMaterial(admin.id, "reset");

    const first = await claimMaterialForUser({
      materialId: material.id,
      userId: userA.id,
      claimRequestId: "req-reset-a",
    });
    const second = await claimMaterialForUser({
      materialId: material.id,
      userId: userB.id,
      claimRequestId: "req-reset-b",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (second.ok) {
      return;
    }

    expect(second.error).toBe("already_claimed");

    const reset = await resetClaimedMaterialByAdmin({
      materialId: material.id,
      adminUserId: admin.id,
      reason: "回收测试",
    });

    expect(reset.ok).toBe(true);

    const quotaA = await getUserMaterialQuota(userA.id);
    const materialAfterReset = await prisma.material.findUniqueOrThrow({
      where: { id: material.id },
    });
    const activeClaimCount = await prisma.materialClaim.count({
      where: { materialId: material.id, status: "ACTIVE" },
    });

    expect(quotaA.usedCount).toBe(0);
    expect(materialAfterReset.status).toBe("AVAILABLE");
    expect(materialAfterReset.exclusiveOwnerId).toBeNull();
    expect(activeClaimCount).toBe(0);
  });

  it("同一条领取记录支持多个发布链接", async () => {
    const admin = await ensureUser({
      username: "materials-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const user = await ensureUser({
      username: "materials-user-a",
      displayName: "用户A",
      dailyClaimLimit: 1,
    });
    const material = await createMaterial(admin.id, "publish-links");

    const claimResult = await claimMaterialForUser({
      materialId: material.id,
      userId: user.id,
      claimRequestId: "req-publish-links",
    });

    expect(claimResult.ok).toBe(true);
    if (!claimResult.ok) {
      return;
    }

    const first = await addPublishLinkForClaim({
      claimId: claimResult.claim.id,
      userId: user.id,
      url: "https://example.com/video-1",
      platform: "抖音",
      note: "主账号",
    });
    const second = await addPublishLinkForClaim({
      claimId: claimResult.claim.id,
      userId: user.id,
      url: "https://example.com/video-2",
      platform: "视频号",
      note: "矩阵号",
    });

    expect(first?.platform).toBe("抖音");
    expect(second?.platform).toBe("视频号");

    let mine = await getMyClaimedMaterials(user.id);
    expect(mine[0]?.publishLinks).toHaveLength(2);

    const deleted = await deletePublishLinkForClaim({
      claimId: claimResult.claim.id,
      linkId: mine[0]!.publishLinks[0]!.id,
      userId: user.id,
    });

    expect(deleted).toBe(true);

    mine = await getMyClaimedMaterials(user.id);
    expect(mine[0]?.publishLinks).toHaveLength(1);
  });

  it("重命名标签后，历史素材会同步显示新标签名", async () => {
    const admin = await ensureUser({
      username: "materials-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const material = await createMaterial(admin.id, "rename-tag");
    await attachTags(material.id, ["春装", "上新"]);

    const createdTag = await createMaterialTag("春装");
    await updateMaterialTag({
      tagId: createdTag.id,
      name: "春季穿搭",
    });

    const links = await prisma.materialTagLink.findMany({
      where: { materialId: material.id },
      include: { tag: true },
      orderBy: { tag: { name: "asc" } },
    });

    const tagNames = links.map((item) => item.tag.name);
    expect(tagNames).toHaveLength(2);
    expect(tagNames).toEqual(expect.arrayContaining(["上新", "春季穿搭"]));
  });

  it("删除标签时只解除关联，不删除素材", async () => {
    const admin = await ensureUser({
      username: "materials-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const material = await createMaterial(admin.id, "delete-tag");
    await attachTags(material.id, ["待删标签", "保留标签"]);

    const tag = await createMaterialTag("待删标签");
    await deleteMaterialTag({
      tagId: tag.id,
    });

    const reloadedMaterial = await prisma.material.findUnique({
      where: { id: material.id },
      include: { tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } } },
    });
    const deletedTag = await prisma.materialTag.findUnique({ where: { id: tag.id } });

    expect(reloadedMaterial?.title).toBe("素材-delete-tag");
    expect(reloadedMaterial?.tags.map((item) => item.tag.name)).toEqual(["保留标签"]);
    expect(deletedTag).toBeNull();
  });

  it("批量操作可以统一更新标签并批量下架", async () => {
    const admin = await ensureUser({
      username: "materials-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const first = await createMaterial(admin.id, "bulk-a");
    const second = await createMaterial(admin.id, "bulk-b");
    await attachTags(first.id, ["旧标签"]);
    await attachTags(second.id, ["旧标签"]);

    const tagResult = await bulkOperateMaterials({
      actorId: admin.id,
      materialIds: [first.id, second.id],
      action: {
        type: "updateTags",
        tags: ["新标签", "短视频"],
      },
    });
    const statusResult = await bulkOperateMaterials({
      actorId: admin.id,
      materialIds: [first.id, second.id],
      action: {
        type: "changeStatus",
        status: "OFF_SHELF",
      },
    });

    const materials = await prisma.material.findMany({
      where: { id: { in: [first.id, second.id] } },
      include: { tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } } },
      orderBy: { sourceFilename: "asc" },
    });

    expect(tagResult.summary.successCount).toBe(2);
    expect(statusResult.summary.successCount).toBe(2);
    expect(materials.map((item) => item.status)).toEqual(["OFF_SHELF", "OFF_SHELF"]);
    expect(materials[0]?.tags).toHaveLength(2);
    expect(materials[1]?.tags).toHaveLength(2);
    expect(materials[0]?.tags.map((item) => item.tag.name)).toEqual(expect.arrayContaining(["新标签", "短视频"]));
    expect(materials[1]?.tags.map((item) => item.tag.name)).toEqual(expect.arrayContaining(["新标签", "短视频"]));
  });

  it("批量重置回公海时会跳过未领取素材，并继续处理已领取素材", async () => {
    const admin = await ensureUser({
      username: "materials-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const user = await ensureUser({
      username: "materials-user-a",
      displayName: "用户A",
      dailyClaimLimit: 2,
    });
    const claimedMaterial = await createMaterial(admin.id, "bulk-reset-claimed");
    const idleMaterial = await createMaterial(admin.id, "bulk-reset-idle");

    await claimMaterialForUser({
      materialId: claimedMaterial.id,
      userId: user.id,
      claimRequestId: "req-bulk-reset",
    });

    const result = await bulkOperateMaterials({
      actorId: admin.id,
      materialIds: [claimedMaterial.id, idleMaterial.id],
      action: {
        type: "resetClaims",
        reason: "批量回收",
      },
    });

    const claimedAfterReset = await prisma.material.findUniqueOrThrow({
      where: { id: claimedMaterial.id },
    });
    const idleAfterReset = await prisma.material.findUniqueOrThrow({
      where: { id: idleMaterial.id },
    });

    expect(result.summary.successCount).toBe(1);
    expect(result.summary.skippedCount).toBe(1);
    expect(result.items.find((item) => item.materialId === claimedMaterial.id)?.status).toBe("success");
    expect(result.items.find((item) => item.materialId === idleMaterial.id)?.status).toBe("skipped");
    expect(claimedAfterReset.status).toBe("AVAILABLE");
    expect(claimedAfterReset.exclusiveOwnerId).toBeNull();
    expect(idleAfterReset.status).toBe("AVAILABLE");
  });

  it("只聚合当前可领取视频素材的标签，并返回计数", async () => {
    const admin = await ensureUser({
      username: "materials-admin",
      displayName: "管理员",
      role: "ADMIN",
    });
    const availableVideo = await createMaterial(admin.id, "tag-cloud-video");
    const offShelfVideo = await createMaterial(admin.id, "tag-cloud-off-shelf");
    const imageMaterial = await prisma.material.create({
      data: {
        title: "图片素材",
        description: "图片素材",
        materialType: "IMAGE",
        status: "AVAILABLE",
        sourceFilename: "image-1.png",
        checksumSha256: "sha256-image-1",
        bucket: "local-private",
        objectKey: "materials/original/image-1.png",
        fileSizeBytes: 100,
        mimeType: "image/png",
        width: 1080,
        height: 1080,
        previewReady: true,
        createdById: admin.id,
        variants: {
          create: [
            {
              kind: "ORIGINAL",
              bucket: "local-private",
              objectKey: "materials/original/image-1.png",
              mimeType: "image/png",
              fileSizeBytes: 100,
              width: 1080,
              height: 1080,
            },
          ],
        },
      },
    });

    await prisma.material.update({
      where: { id: offShelfVideo.id },
      data: { status: "OFF_SHELF" },
    });

    await attachTags(availableVideo.id, ["POLO", "黑色"]);
    await attachTags(offShelfVideo.id, ["下架标签"]);
    await attachTags(imageMaterial.id, ["图片标签"]);

    const tags = await getAvailableMaterialTags({ materialType: "VIDEO" });

    expect(tags).toHaveLength(2);
    expect(tags).toEqual(
      expect.arrayContaining([
        { name: "POLO", count: 1 },
        { name: "黑色", count: 1 },
      ]),
    );
  });
});
