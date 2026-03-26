import { resolveSiteNavLabels, type SiteNavLabels } from "@/lib/site-config";
import type { UserRole } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  description: string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

function buildUserNavigationGroups(
  labelOverrides?: SiteNavLabels,
): NavGroup[] {
  const labels = resolveSiteNavLabels(labelOverrides);

  return [
    {
      id: "workspace",
      label: labels.workspaceGroup,
      items: [
        { href: "/", label: labels.home, description: "查看今日状态和快捷入口" },
        { href: "/apps", label: labels.apps, description: "浏览内部 AI 应用并提交任务" },
        { href: "/assets", label: labels.assets, description: "浏览可领取素材并完成下载" },
        { href: "/profile", label: labels.profile, description: "查看个人素材、额度和使用记录" },
      ],
    },
  ];
}

function buildAdminNavigationGroups(
  labelOverrides?: SiteNavLabels,
): NavGroup[] {
  const labels = resolveSiteNavLabels(labelOverrides);

  return [
    {
      id: "overview",
      label: labels.overviewGroup,
      items: [{ href: "/admin", label: labels.adminOverview, description: "查看后台概览和系统状态" }],
    },
    {
      id: "operations",
      label: labels.operationsGroup,
      items: [
        { href: "/admin/apps", label: labels.adminApps, description: "维护应用模板和配置协议" },
        { href: "/admin/prompt-templates", label: labels.promptTemplates, description: "集中管理模板资产、标签和适用范围" },
        { href: "/admin/categories", label: labels.categories, description: "维护应用中心分类" },
        { href: "/admin/banners", label: labels.banners, description: "管理应用中心运营位" },
      ],
    },
    {
      id: "materials",
      label: labels.materialsGroup,
      items: [
        { href: "/admin/materials", label: labels.materials, description: "批量上传素材、调整状态并回收公海" },
      ],
    },
    {
      id: "execution",
      label: labels.executionGroup,
      items: [
        { href: "/tasks", label: labels.tasks, description: "统一查看任务状态、结果和处理进度" },
        { href: "/sync", label: labels.sync, description: "查看同步状态和异常重试" },
      ],
    },
    {
      id: "settings",
      label: labels.settingsGroup,
      items: [
        { href: "/admin/settings/site", label: labels.siteSettings, description: "维护站点名称、品牌文案和导航命名" },
        { href: "/admin/settings/integrations", label: labels.integrationSettings, description: "统一管理算力通道、飞书和同步目标" },
        { href: "/admin/settings/secrets", label: labels.secretStatus, description: "只读查看密钥状态与配置来源" },
      ],
    },
    {
      id: "accounts",
      label: labels.accountsGroup,
      items: [{ href: "/admin/users", label: labels.users, description: "管理角色、额度和账号状态" }],
    },
  ];
}

export function getNavigationGroups(role: UserRole, labelOverrides?: SiteNavLabels) {
  const userNavigationGroups = buildUserNavigationGroups(labelOverrides);
  const adminNavigationGroups = buildAdminNavigationGroups(labelOverrides);

  return role === "ADMIN" ? [...userNavigationGroups, ...adminNavigationGroups] : userNavigationGroups;
}

export function getNavigation(role: UserRole, labelOverrides?: SiteNavLabels) {
  return getNavigationGroups(role, labelOverrides).flatMap((group) => group.items);
}
