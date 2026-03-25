import { z } from "zod";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  isPrismaSchemaMismatchError,
  logPrismaRuntimeDiagnostic,
} from "@/lib/prisma-runtime-diagnostics";
import {
  getRunningHubChannelSecretKeys,
  normalizeRunningHubChannels,
} from "@/lib/runninghub-channels";
import {
  normalizeSiteNavLabels,
  resolveSiteNavLabels,
  type SiteBrandingConfig,
  type SiteNavLabels,
} from "@/lib/site-config";
import type { RunningHubChannelConfig } from "@/lib/types";

const DEFAULT_SITE_DESCRIPTION = "Internal AI application workbench for team collaboration";
const DEFAULT_THEME_COLOR = "#0066DD";
const DEFAULT_WORKSPACE_LABEL = "Team Workspace";
const DEFAULT_ADMIN_WORKSPACE_LABEL = "Admin Workspace";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(value: unknown) {
  return normalizeText(value);
}

function normalizeThemeColor(value: unknown) {
  const normalized = normalizeText(value);
  return /^#([0-9a-fA-F]{6})$/.test(normalized) ? normalized.toUpperCase() : DEFAULT_THEME_COLOR;
}

function isPlaceholderValue(value: string) {
  return (
    !value ||
    value.startsWith("replace_with_") ||
    value === "local-dev-jwt-secret-please-change"
  );
}

function parseJsonString(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function readSiteSettingsRecord() {
  try {
    return await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      logPrismaRuntimeDiagnostic("site settings read", error);
      return null;
    }
    throw error;
  }
}

async function readIntegrationSettingsRecord() {
  try {
    return await prisma.integrationSettings.findUnique({
      where: { id: "default" },
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      logPrismaRuntimeDiagnostic("integration settings read", error);
      return null;
    }
    throw error;
  }
}

async function readFeishuSettingsRecord() {
  try {
    return await prisma.feishuSettings.findUnique({
      where: { id: "default" },
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      logPrismaRuntimeDiagnostic("feishu settings read", error);
      return null;
    }
    throw error;
  }
}

export const siteSettingsUpdateSchema = z.object({
  siteName: z.string().trim().min(1).max(80),
  siteDescription: z.string().trim().min(1).max(200),
  workspaceLabel: z.string().trim().min(1).max(40),
  adminWorkspaceLabel: z.string().trim().min(1).max(40),
  themeColor: z.string().trim().regex(/^#([0-9a-fA-F]{6})$/, "themeColor must be a hex color"),
  navLabels: z.record(z.string(), z.string()).default({}),
});

export const integrationSettingsUpdateSchema = z.object({
  runninghubBaseUrl: z.string().trim().url(),
  runninghubDefaultWebappId: z.string().trim().min(1).max(64),
  runninghubChannels: z
    .array(
      z.object({
        code: z.string().trim().min(1).max(64),
        name: z.string().trim().min(1).max(80),
        apiKeyEnvName: z.string().trim().min(1).max(128),
        concurrencyLimit: z.coerce.number().int().min(1).max(1000),
        priority: z.coerce.number().int().min(1).max(999),
        enabled: z.boolean(),
      }),
    )
    .min(1),
  feishuBaseUrl: z.string().trim().url(),
  feishuAppToken: z.string().trim(),
  feishuTableId: z.string().trim(),
  columnMappings: z.unknown().optional(),
});

export type ResolvedSiteSettings = SiteBrandingConfig;

export type ResolvedIntegrationSettings = {
  runninghubBaseUrl: string;
  runninghubDefaultWebappId: string;
  runninghubChannels: RunningHubChannelConfig[];
  feishuBaseUrl: string;
};

export type SecretStatusItem = {
  envKey: string;
  label: string;
  description: string;
  configured: boolean;
  required: boolean;
  maskedValue: string;
  source: "env";
};

export type ResolvedFeishuSyncSettings = {
  feishuAppToken: string;
  feishuTableId: string;
  columnMappings: unknown;
};

function maskSecretValue(value: string) {
  if (!value) {
    return "未配置";
  }

  if (value.length <= 8) {
    return `${value.slice(0, 1)}***${value.slice(-1)}`;
  }

  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

export async function getResolvedSiteSettings(): Promise<ResolvedSiteSettings> {
  const record = await readSiteSettingsRecord();
  const navLabels = resolveSiteNavLabels(
    normalizeSiteNavLabels(parseJsonString(record?.navLabelsJson)),
  );

  return {
    siteName: normalizeText(record?.siteName) || env.APP_NAME,
    siteDescription: normalizeText(record?.siteDescription) || DEFAULT_SITE_DESCRIPTION,
    workspaceLabel: normalizeText(record?.workspaceLabel) || DEFAULT_WORKSPACE_LABEL,
    adminWorkspaceLabel:
      normalizeText(record?.adminWorkspaceLabel) || DEFAULT_ADMIN_WORKSPACE_LABEL,
    themeColor: normalizeThemeColor(record?.themeColor),
    navLabels,
  };
}

export async function getResolvedIntegrationSettings(): Promise<ResolvedIntegrationSettings> {
  const record = await readIntegrationSettingsRecord();

  return {
    runninghubBaseUrl: normalizeUrl(record?.runninghubBaseUrl) || env.RUNNINGHUB_BASE_URL,
    runninghubDefaultWebappId:
      normalizeText(record?.runninghubDefaultWebappId) || env.RUNNINGHUB_WEBAPP_ID,
    runninghubChannels: normalizeRunningHubChannels(record?.runninghubChannelsJson, {
      legacyConcurrencyLimit: record?.taskMaxConcurrency,
    }),
    feishuBaseUrl: normalizeUrl(record?.feishuBaseUrl) || env.FEISHU_BASE_URL,
  };
}

export async function getResolvedFeishuSyncSettings(): Promise<ResolvedFeishuSyncSettings> {
  const record = await readFeishuSettingsRecord();

  return {
    feishuAppToken: normalizeText(record?.feishuAppToken) || env.FEISHU_APP_TOKEN,
    feishuTableId: normalizeText(record?.feishuTableId) || env.FEISHU_TABLE_ID,
    columnMappings: record?.columnMappings ?? [],
  };
}

export async function saveSiteSettings(input: z.infer<typeof siteSettingsUpdateSchema>) {
  const parsed = siteSettingsUpdateSchema.parse(input);
  const navLabels: SiteNavLabels = normalizeSiteNavLabels(parsed.navLabels);

  return prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {
      siteName: parsed.siteName,
      siteDescription: parsed.siteDescription,
      workspaceLabel: parsed.workspaceLabel,
      adminWorkspaceLabel: parsed.adminWorkspaceLabel,
      themeColor: parsed.themeColor.toUpperCase(),
      navLabelsJson: JSON.stringify(navLabels),
    },
    create: {
      id: "default",
      siteName: parsed.siteName,
      siteDescription: parsed.siteDescription,
      workspaceLabel: parsed.workspaceLabel,
      adminWorkspaceLabel: parsed.adminWorkspaceLabel,
      themeColor: parsed.themeColor.toUpperCase(),
      navLabelsJson: JSON.stringify(navLabels),
    },
  });
}

export async function saveIntegrationSettings(
  input: z.infer<typeof integrationSettingsUpdateSchema>,
) {
  const parsed = integrationSettingsUpdateSchema.parse(input);

  return prisma.integrationSettings.upsert({
    where: { id: "default" },
    update: {
      runninghubBaseUrl: parsed.runninghubBaseUrl,
      runninghubDefaultWebappId: parsed.runninghubDefaultWebappId,
      runninghubChannelsJson: parsed.runninghubChannels,
      feishuBaseUrl: parsed.feishuBaseUrl,
    },
    create: {
      id: "default",
      runninghubBaseUrl: parsed.runninghubBaseUrl,
      runninghubDefaultWebappId: parsed.runninghubDefaultWebappId,
      runninghubChannelsJson: parsed.runninghubChannels,
      feishuBaseUrl: parsed.feishuBaseUrl,
    },
  });
}

export async function getSecretStatusItems(): Promise<SecretStatusItem[]> {
  const integrationSettings = await getResolvedIntegrationSettings();
  const channelSecrets = getRunningHubChannelSecretKeys(integrationSettings.runninghubChannels).map(
    (envKey) => ({
      envKey,
      label: `RunningHub Channel Key (${envKey})`,
      description: "绑定 RunningHub 通道的 API Key，仅用于对应通道的提交、查询和取消。",
      value: process.env[envKey]?.trim() ?? "",
      required: true,
    }),
  );

  const items = [
    {
      envKey: "JWT_SECRET",
      label: "JWT Secret",
      description: "负责登录态签名与鉴权校验。",
      value: env.JWT_SECRET,
      required: true,
    },
    {
      envKey: "FEISHU_APP_ID",
      label: "Feishu App ID",
      description: "负责获取 Feishu tenant access token。",
      value: env.FEISHU_APP_ID,
      required: true,
    },
    {
      envKey: "FEISHU_APP_SECRET",
      label: "Feishu App Secret",
      description: "与 Feishu App ID 配套使用。",
      value: env.FEISHU_APP_SECRET,
      required: true,
    },
    {
      envKey: "RUNNINGHUB_WEBHOOK_SECRET",
      label: "RunningHub Webhook Secret",
      description: "生产环境下用于校验 RunningHub 回调签名。",
      value: env.RUNNINGHUB_WEBHOOK_SECRET,
      required: false,
    },
    ...channelSecrets,
  ];

  return items.map((item) => ({
    envKey: item.envKey,
    label: item.label,
    description: item.description,
    configured: !isPlaceholderValue(item.value),
    required: item.required,
    maskedValue: maskSecretValue(item.value),
    source: "env" as const,
  }));
}
