import { NextResponse } from "next/server";

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
  getResolvedFeishuSyncSettings,
  getResolvedIntegrationSettings,
  integrationSettingsUpdateSchema,
  saveIntegrationSettings,
} from "@/lib/settings";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    ...integrationSettings,
    feishuAppToken: resolvedFeishu.target.appToken,
    feishuTableId: resolvedFeishu.target.tableId,
    columnMappings: mappingRecordToEntries(
      normalizeFeishuColumnMappings(resolvedFeishu.globalMapping, {
        allowedSourceKeys: sharedSourceKeys,
      }),
    ),
  });
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

    await saveIntegrationSettings(parsed);

    await prisma.feishuSettings.upsert({
      where: { id: "default" },
      update: {
        feishuAppToken: parsed.feishuAppToken,
        feishuTableId: parsed.feishuTableId,
        columnMappings: normalizedMappings,
      },
      create: {
        id: "default",
        feishuAppToken: parsed.feishuAppToken,
        feishuTableId: parsed.feishuTableId,
        columnMappings: normalizedMappings,
      },
    });

    const backfill = await backfillFeishuSyncForTasks({
      actorId: session.sub,
      mode: "ALL",
    });

    return NextResponse.json({
      ok: true,
      settings: {
        ...(await getResolvedIntegrationSettings()),
        ...(await getResolvedFeishuSyncSettings()),
      },
      backfill,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
