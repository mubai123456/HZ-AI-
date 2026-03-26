/**
 * Aggregated admin overview data.
 */

import { prisma } from "@/lib/prisma";

export interface AdminOverview {
  metrics: Array<{ label: string; value: string }>;
  managementLinks: Array<{ title: string; description: string; href: string }>;
  appHealth: {
    appName: string;
    successRate: number;
    todayCalls: number;
    avgDuration: string;
    queuePeak: number;
  };
}

const MANAGEMENT_LINKS: AdminOverview["managementLinks"] = [
  {
    title: "素材管理",
    description: "录入公海素材、查看认领日志并执行回收重置。",
    href: "/admin/materials",
  },
  {
    title: "用户管理",
    description: "管理角色、启用状态和每日认领额度。",
    href: "/admin/users",
  },
  {
    title: "应用配置",
    description: "维护应用列表、分类、标签、费用与排序。",
    href: "/admin/apps",
  },
  {
    title: "站点设置",
    description: "维护站点名称、品牌文案和导航命名。",
    href: "/admin/settings/site",
  },
  {
    title: "集成设置",
    description: "统一管理算力通道、飞书和同步目标。",
    href: "/admin/settings/integrations",
  },
  {
    title: "同步日志",
    description: "检查同步异常并触发重试。",
    href: "/sync",
  },
  {
    title: "任务中心",
    description: "追踪任务执行队列和运行明细。",
    href: "/tasks",
  },
];

function buildEmptyAdminOverview(): AdminOverview {
  return {
    metrics: [
      { label: "今日任务", value: "0" },
      { label: "运行中", value: "0" },
      { label: "排队中", value: "0" },
      { label: "失败率", value: "0%" },
      { label: "活跃用户", value: "0" },
      { label: "公海素材", value: "0" },
      { label: "已认领", value: "0" },
      { label: "今日回收", value: "0" },
    ],
    managementLinks: MANAGEMENT_LINKS,
    appHealth: {
      appName: "-",
      successRate: 0,
      todayCalls: 0,
      avgDuration: "0s",
      queuePeak: 0,
    },
  };
}

function formatDuration(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayTasks,
      runningTasks,
      queuedTasks,
      failedTasks,
      activeUsers,
      completedTasks,
      availableMaterials,
      claimedMaterials,
      resetClaimsToday,
    ] = await Promise.all([
      prisma.task.count({ where: { createdAt: { gte: today } } }),
      prisma.task.count({ where: { status: "RUNNING" } }),
      prisma.task.count({ where: { status: "QUEUED" } }),
      prisma.task.count({ where: { status: "FAILED", createdAt: { gte: today } } }),
      prisma.user.count({ where: { active: true } }),
      prisma.task.findMany({
        where: {
          createdAt: { gte: today },
          completedAt: { not: null },
        },
        select: {
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.material.count({
        where: {
          status: "AVAILABLE",
          deletedAt: null,
        },
      }),
      prisma.material.count({
        where: {
          status: "CLAIMED",
          deletedAt: null,
        },
      }),
      prisma.materialClaim.count({
        where: {
          status: "RESET_BY_ADMIN",
          updatedAt: { gte: today },
        },
      }),
    ]);

    const totalDurationSeconds = completedTasks.reduce((sum, task) => {
      if (!task.completedAt) {
        return sum;
      }

      return sum + (task.completedAt.getTime() - task.createdAt.getTime()) / 1000;
    }, 0);
    const avgDurationSeconds =
      completedTasks.length > 0 ? Math.round(totalDurationSeconds / completedTasks.length) : 0;

    const firstApp = await prisma.app.findFirst({
      where: { enabled: true },
      include: {
        tasks: {
          where: { createdAt: { gte: today } },
          select: { status: true },
        },
      },
    });

    const successRate =
      firstApp && firstApp.tasks.length > 0
        ? Math.round(
            (firstApp.tasks.filter((task) => task.status === "SUCCEEDED").length /
              firstApp.tasks.length) *
              100,
          )
        : 0;

    const failureRate = todayTasks === 0 ? 0 : Math.round((failedTasks / todayTasks) * 100);

    return {
      metrics: [
        { label: "今日任务", value: String(todayTasks) },
        { label: "运行中", value: String(runningTasks) },
        { label: "排队中", value: String(queuedTasks) },
        { label: "失败率", value: `${failureRate}%` },
        { label: "活跃用户", value: String(activeUsers) },
        { label: "公海素材", value: String(availableMaterials) },
        { label: "已认领", value: String(claimedMaterials) },
        { label: "今日回收", value: String(resetClaimsToday) },
      ],
      managementLinks: MANAGEMENT_LINKS,
      appHealth: {
        appName: firstApp?.name ?? "-",
        successRate,
        todayCalls: firstApp?.tasks.length ?? 0,
        avgDuration: formatDuration(avgDurationSeconds),
        queuePeak: runningTasks + queuedTasks,
      },
    };
  } catch (error) {
    console.error("[admin] Failed to load overview data.", error);
    return buildEmptyAdminOverview();
  }
}
