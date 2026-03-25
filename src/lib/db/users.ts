import type { Prisma } from "@prisma/client";

import { buildBulkOperationResult } from "@/lib/db/bulk";
import { prisma } from "@/lib/prisma";
import type { BulkOperationResult, UserBulkAction, UserRecord } from "@/lib/types";

const adminUserSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  active: true,
  deletedAt: true,
  lastLoginAt: true,
  dailyClaimLimit: true,
} satisfies Prisma.UserSelect;

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

export type UserDeletionBlocker = {
  key: "tasks" | "materials" | "claims" | "syncLogs" | "auditLogs";
  label: string;
  count: number;
};

export async function getUsers(): Promise<UserRecord[]> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "desc" }, { updatedAt: "desc" }],
    select: adminUserSelect,
  });

  return users.map(mapDbUserToRecord);
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: adminUserSelect,
  });

  return user && !user.deletedAt ? mapDbUserToRecord(user) : null;
}

export async function canRemoveActiveAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, active: true, deletedAt: true },
  });

  if (!user || user.deletedAt || user.role !== "ADMIN" || !user.active) {
    return true;
  }

  const remainingAdminCount = await prisma.user.count({
    where: {
      role: "ADMIN",
      active: true,
      deletedAt: null,
      NOT: { id: userId },
    },
  });

  return remainingAdminCount > 0;
}

export async function getUserDeletionBlockers(userId: string): Promise<UserDeletionBlocker[]> {
  const [taskCount, materialCount, claimCount, syncLogCount, auditLogCount] =
    await prisma.$transaction([
      prisma.task.count({ where: { createdById: userId } }),
      prisma.material.count({ where: { createdById: userId } }),
      prisma.materialClaim.count({ where: { userId } }),
      prisma.syncLog.count({ where: { actorId: userId } }),
      prisma.auditLog.count({ where: { actorId: userId } }),
    ]);

  const blockers: UserDeletionBlocker[] = [
    { key: "tasks", label: "任务记录", count: taskCount },
    { key: "materials", label: "素材上传记录", count: materialCount },
    { key: "claims", label: "素材领取记录", count: claimCount },
    { key: "syncLogs", label: "同步日志", count: syncLogCount },
    { key: "auditLogs", label: "审计日志", count: auditLogCount },
  ];

  return blockers.filter((item) => item.count > 0);
}

export async function deleteUserPermanently(userId: string): Promise<
  | {
      ok: true;
      deletedUser: {
        id: string;
        username: string;
      };
      mode: "deleted" | "archived";
    }
  | {
      ok: false;
      error: string;
      blockers?: UserDeletionBlocker[];
    }
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    return { ok: false, error: "用户不存在。" };
  }

  const blockers = await getUserDeletionBlockers(userId);
  if (blockers.length > 0) {
    const deletedAt = new Date();
    const archivedUsername = buildArchivedUsername(user.id, deletedAt);

    await prisma.user.update({
      where: { id: userId },
      data: {
        username: archivedUsername,
        active: false,
        passwordHash: null,
        deletedAt,
      },
    });

    return {
      ok: true,
      deletedUser: {
        id: user.id,
        username: user.username,
      },
      mode: "archived",
    };
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return {
    ok: true,
    deletedUser: user,
    mode: "deleted",
  };
}

function buildArchivedUsername(userId: string, deletedAt: Date) {
  const stamp = deletedAt.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `deleted_${stamp}_${userId.slice(-6)}`;
}

export async function bulkOperateUsers(input: {
  ids: string[];
  action: UserBulkAction;
  operatorId: string;
}): Promise<BulkOperationResult> {
  const results: Array<{ id: string; status: "success" | "skipped" | "failed"; message: string }> = [];

  for (const id of input.ids) {
    if (id === input.operatorId) {
      results.push({ id, status: "skipped", message: "不能批量修改当前登录账号" });
      continue;
    }

    const current = await prisma.user.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!current || current.deletedAt) {
      results.push({ id, status: "skipped", message: "用户不存在" });
      continue;
    }

    try {
      if (input.action.type === "delete") {
        const result = await deleteUserPermanently(id);
        if (!result.ok) {
          results.push({ id, status: "failed", message: result.error });
          continue;
        }

        results.push({
          id,
          status: "success",
          message: result.mode === "archived" ? "用户已归档" : "用户已删除",
        });
        continue;
      }

      if (input.action.type === "setActive") {
        const user = await prisma.user.findUnique({
          where: { id },
          select: { role: true, active: true, deletedAt: true },
        });

        if (!user || user.deletedAt) {
          results.push({ id, status: "skipped", message: "用户不存在" });
          continue;
        }

        if (user.role === "ADMIN" && user.active && !input.action.active && !(await canRemoveActiveAdmin(id))) {
          results.push({ id, status: "failed", message: "系统至少需要保留一个启用中的管理员账号" });
          continue;
        }

        await prisma.user.update({
          where: { id },
          data: { active: input.action.active },
        });
        results.push({
          id,
          status: "success",
          message: input.action.active ? "用户已启用" : "用户已停用",
        });
        continue;
      }

      if (input.action.type === "setRole") {
        const user = await prisma.user.findUnique({
          where: { id },
          select: { role: true, active: true, deletedAt: true },
        });

        if (!user || user.deletedAt) {
          results.push({ id, status: "skipped", message: "用户不存在" });
          continue;
        }

        if (
          user.role === "ADMIN" &&
          user.active &&
          input.action.role !== "ADMIN" &&
          !(await canRemoveActiveAdmin(id))
        ) {
          results.push({ id, status: "failed", message: "系统至少需要保留一个启用中的管理员账号" });
          continue;
        }

        await prisma.user.update({
          where: { id },
          data: { role: input.action.role },
        });
        results.push({ id, status: "success", message: "用户角色已更新" });
        continue;
      }

      if (input.action.type === "setDailyClaimLimit") {
        await prisma.user.update({
          where: { id },
          data: { dailyClaimLimit: input.action.dailyClaimLimit },
        });
        results.push({ id, status: "success", message: "每日额度已更新" });
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

function mapDbUserToRecord(user: AdminUserRow): UserRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt
      ? `${user.lastLoginAt.toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })} ${user.lastLoginAt.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "从未登录",
    dailyClaimLimit: user.dailyClaimLimit,
  };
}
