function trimText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export const SITE_NAV_SECTIONS = [
  {
    id: "workspace",
    label: "用户侧导航",
    fields: [
      { key: "workspaceGroup", label: "工作入口分组" },
      { key: "home", label: "工作台" },
      { key: "apps", label: "应用中心" },
      { key: "assets", label: "素材大厅" },
      { key: "profile", label: "我的内容" },
    ],
  },
  {
    id: "admin-overview",
    label: "管理总览",
    fields: [
      { key: "overviewGroup", label: "工作与总览分组" },
      { key: "adminOverview", label: "系统概览" },
    ],
  },
  {
    id: "operations",
    label: "运营配置",
    fields: [
      { key: "operationsGroup", label: "应用运营分组" },
      { key: "adminApps", label: "应用配置" },
      { key: "promptTemplates", label: "提示词模板" },
      { key: "categories", label: "分类管理" },
      { key: "banners", label: "Banner 管理" },
    ],
  },
  {
    id: "materials",
    label: "素材运营",
    fields: [
      { key: "materialsGroup", label: "素材运营分组" },
      { key: "materials", label: "素材管理" },
    ],
  },
  {
    id: "execution",
    label: "系统执行",
    fields: [
      { key: "executionGroup", label: "系统执行分组" },
      { key: "tasks", label: "任务中心" },
      { key: "sync", label: "同步日志" },
    ],
  },
  {
    id: "settings",
    label: "站点与集成",
    fields: [
      { key: "settingsGroup", label: "站点与集成分组" },
      { key: "siteSettings", label: "站点设置" },
      { key: "integrationSettings", label: "集成设置" },
      { key: "secretStatus", label: "密钥状态" },
    ],
  },
  {
    id: "accounts",
    label: "权限与账号",
    fields: [
      { key: "accountsGroup", label: "权限与账号分组" },
      { key: "users", label: "用户管理" },
    ],
  },
] as const;

export type SiteNavLabelKey =
  (typeof SITE_NAV_SECTIONS)[number]["fields"][number]["key"];

export type SiteNavLabels = Partial<Record<SiteNavLabelKey, string>>;
export type ResolvedSiteNavLabels = Record<SiteNavLabelKey, string>;

export const DEFAULT_SITE_NAV_LABELS: ResolvedSiteNavLabels = {
  workspaceGroup: "工作入口",
  home: "工作台",
  apps: "应用中心",
  assets: "素材大厅",
  profile: "我的内容",
  overviewGroup: "工作与总览",
  adminOverview: "系统概览",
  operationsGroup: "应用运营",
  adminApps: "应用配置",
  promptTemplates: "提示词模板",
  categories: "分类管理",
  banners: "Banner 管理",
  materialsGroup: "素材运营",
  materials: "素材管理",
  executionGroup: "系统执行",
  tasks: "任务中心",
  sync: "同步日志",
  settingsGroup: "站点与集成",
  siteSettings: "站点设置",
  integrationSettings: "集成设置",
  secretStatus: "密钥状态",
  accountsGroup: "权限与账号",
  users: "用户管理",
};

export type SiteBrandingConfig = {
  siteName: string;
  siteDescription: string;
  workspaceLabel: string;
  adminWorkspaceLabel: string;
  themeColor: string;
  navLabels: ResolvedSiteNavLabels;
};

export function normalizeSiteNavLabels(input: unknown): SiteNavLabels {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const labels: SiteNavLabels = {};

  for (const key of Object.keys(DEFAULT_SITE_NAV_LABELS) as SiteNavLabelKey[]) {
    const value = trimText((input as Record<string, unknown>)[key]);
    if (value) {
      labels[key] = value;
    }
  }

  return labels;
}

export function resolveSiteNavLabels(overrides?: SiteNavLabels): ResolvedSiteNavLabels {
  const resolved = { ...DEFAULT_SITE_NAV_LABELS };

  for (const key of Object.keys(DEFAULT_SITE_NAV_LABELS) as SiteNavLabelKey[]) {
    const nextValue = trimText(overrides?.[key]);
    if (nextValue) {
      resolved[key] = nextValue;
    }
  }

  return resolved;
}
