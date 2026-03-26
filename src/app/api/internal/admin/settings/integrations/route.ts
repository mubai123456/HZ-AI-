import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { backfillFeishuSyncForTasks } from "@/lib/feishu-sync-jobs";
import {
  mappingRecordToEntries,
  normalizeFeishuColumnMappings,
  resolveFeishuSyncConfig,
} from "@/lib/feishu-sync";
import { getSharedFeishuSyncSourceKeys } from "@/lib/feishu-sync-fields";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  buildSchemaMismatchUserMessage,
  isPrismaSchemaMismatchError,
  logPrismaRuntimeDiagnostic,
} from "@/lib/prisma-runtime-diagnostics";
import {
  getResolvedFeishuSyncSettings,
  getResolvedIntegrationSettings,
  integrationSettingsUpdateSchema,
  saveIntegrationSettings,
} from "@/lib/settings";
import { getCurrentSession } from "@/lib/session";

function maskStoredCredential(value: string) {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return `${value.slice(0, 1)}***${value.slice(-1)}`;
  }

  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function preserveMaskedSecret(
  inputValue: string | undefined,
  currentValue: string,
  fallbackValue = "",
) {
  if (inputValue === undefined) {
    return "";
  }

  if (currentValue && inputValue === maskStoredCredential(currentValue)) {
    return currentValue;
  }

  if (!currentValue && fallbackValue && inputValue === maskStoredCredential(fallbackValue)) {
    return "";
  }

  return inputValue;
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [integrationSettings, feishuSettings] = await Promise.all([
      getResolvedIntegrationSettings(),
      getResolvedFeishuSyncSettings(),
    ]);
    const sharedSourceKeys = getSharedFeishuSyncSourceKeys();

    const resolvedFeishu = resolveFeishuSyncConfig({
      globalSettings: {
        feishuAppToken: feishuSettings.feishuAppToken,
        feishuTableId: feishuSettings.feishuTableId,
        columnMappings: feishuSettings.columnMappings,
      },
      envTarget: {
        appToken: env.FEISHU_APP_TOKEN,
        tableId: env.FEISHU_TABLE_ID,
      },
      envSecret: env.FEISHU_APP_SECRET,
    });

    return NextResponse.json({
      runninghubDefaultWebappId: integrationSettings.runninghubDefaultWebappId,
      runninghubChannels: integrationSettings.runninghubChannels.map((channel) => ({
        ...channel,
        apiKey:
          channel.credentialMode === "DIRECT" && channel.apiKey
            ? maskStoredCredential(channel.apiKey)
            : channel.apiKey,
      })),
      feishuBaseUrl: integrationSettings.feishuBaseUrl,
      feishuAppId: feishuSettings.feishuAppId,
      feishuAppSecret: feishuSettings.feishuAppSecret
        ? maskStoredCredential(feishuSettings.feishuAppSecret)
        : "",
      feishuAppToken: resolvedFeishu.target.appToken,
      feishuTableId: resolvedFeishu.target.tableId,
      columnMappings: mappingRecordToEntries(
        normalizeFeishuColumnMappings(resolvedFeishu.globalMapping, {
          allowedSourceKeys: sharedSourceKeys,
        }),
      ),
    });
  } catch (error) {
    logPrismaRuntimeDiagnostic("integration settings route GET", error);
    if (!isPrismaSchemaMismatchError(error)) {
      throw error;
    }

    return NextResponse.json(
      { error: buildSchemaMismatchUserMessage("集成设置") },
      { status: 500 },
    );
  }
}

function formatIntegrationValidationError(error: ZodError) {
  return error.issues
    .map((issue) => {
      const channelIndex =
        issue.path[0] === "runninghubChannels" && typeof issue.path[1] === "number"
          ? Number(issue.path[1]) + 1
          : null;

      if (channelIndex && issue.path[2] === "apiKey") {
        return `通道 ${channelIndex} 的 API 凭据校验失败：${issue.message}`;
      }

      if (channelIndex && issue.path[2] === "name") {
        return `通道 ${channelIndex} 的名称不能为空`;
      }

      if (channelIndex && issue.path[2] === "code") {
        return `通道 ${channelIndex} 的编码不能为空`;
      }

      if (issue.path[0] === "runninghubDefaultWebappId") {
        return "默认 WebApp ID 不能为空";
      }

      if (issue.path[0] === "feishuBaseUrl") {
        return "飞书基础地址格式不正确";
      }

      return issue.message;
    })
    .join("；");
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = integrationSettingsUpdateSchema.parse(body);
    const sharedSourceKeys = getSharedFeishuSyncSourceKeys();
    const normalizedMappings = mappingRecordToEntries(
      normalizeFeishuColumnMappings(parsed.columnMappings, {
        allowedSourceKeys: sharedSourceKeys,
      }),
    );
    const currentFeishuSettings = await prisma.feishuSettings.findUnique({
      where: { id: "default" },
    });
    const preservedFeishuAppSecret = preserveMaskedSecret(
      parsed.feishuAppSecret,
      currentFeishuSettings?.feishuAppSecret ?? "",
      env.FEISHU_APP_SECRET,
    );

    await saveIntegrationSettings(parsed);

    await prisma.feishuSettings.upsert({
      where: { id: "default" },
      update: {
        feishuAppId: parsed.feishuAppId,
        feishuAppSecret: preservedFeishuAppSecret,
        feishuAppToken: parsed.feishuAppToken,
        feishuTableId: parsed.feishuTableId,
        columnMappings: normalizedMappings,
      },
      create: {
        id: "default",
        feishuAppId: parsed.feishuAppId,
        feishuAppSecret: preservedFeishuAppSecret,
        feishuAppToken: parsed.feishuAppToken,
        feishuTableId: parsed.feishuTableId,
        columnMappings: normalizedMappings,
      },
    });

    const backfill = await backfillFeishuSyncForTasks({
      actorId: session.sub,
      mode: "ALL",
    });
    const latestIntegrationSettings = await getResolvedIntegrationSettings();
    const latestFeishuSettings = await getResolvedFeishuSyncSettings();

    return NextResponse.json({
      ok: true,
      settings: {
        runninghubDefaultWebappId: latestIntegrationSettings.runninghubDefaultWebappId,
        runninghubChannels: latestIntegrationSettings.runninghubChannels.map((channel) => ({
          ...channel,
          apiKey:
            channel.credentialMode === "DIRECT" && channel.apiKey
              ? maskStoredCredential(channel.apiKey)
              : channel.apiKey,
        })),
        feishuBaseUrl: latestIntegrationSettings.feishuBaseUrl,
        feishuAppId: latestFeishuSettings.feishuAppId,
        feishuAppSecret: latestFeishuSettings.feishuAppSecret
          ? maskStoredCredential(latestFeishuSettings.feishuAppSecret)
          : "",
        feishuAppToken: latestFeishuSettings.feishuAppToken,
        feishuTableId: latestFeishuSettings.feishuTableId,
        columnMappings: latestFeishuSettings.columnMappings,
      },
      backfill,
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      logPrismaRuntimeDiagnostic("integration settings route PUT", error);
      return NextResponse.json(
        { error: buildSchemaMismatchUserMessage("集成设置") },
        { status: 500 },
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: formatIntegrationValidationError(error) || "集成设置校验失败" },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
