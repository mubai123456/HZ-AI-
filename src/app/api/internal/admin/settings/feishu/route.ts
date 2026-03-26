import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { backfillFeishuSyncForTasks } from "@/lib/feishu-sync-jobs";
import {
  mappingRecordToEntries,
  normalizeFeishuColumnMappings,
  resolveFeishuSyncConfig,
} from "@/lib/feishu-sync";
import { prisma } from "@/lib/prisma";
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

  const settings = await prisma.feishuSettings.findUnique({
    where: { id: "default" },
  });

  const resolved = resolveFeishuSyncConfig({
    globalSettings: settings,
    envTarget: {
      appToken: env.FEISHU_APP_TOKEN,
      tableId: env.FEISHU_TABLE_ID,
    },
    envSecret: env.FEISHU_APP_SECRET,
  });

  return NextResponse.json({
    feishuAppId: settings?.feishuAppId?.trim() || env.FEISHU_APP_ID,
    feishuAppSecret: settings?.feishuAppSecret?.trim()
      ? maskStoredCredential(settings.feishuAppSecret.trim())
      : maskStoredCredential(env.FEISHU_APP_SECRET),
    feishuAppToken: resolved.target.appToken,
    feishuTableId: resolved.target.tableId,
    columnMappings: mappingRecordToEntries(resolved.globalMapping),
  });
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { feishuAppId, feishuAppSecret, feishuAppToken, feishuTableId, columnMappings } = body;
  const normalizedMappings = mappingRecordToEntries(
    normalizeFeishuColumnMappings(columnMappings),
  );

  try {
    const currentSettings = await prisma.feishuSettings.findUnique({
      where: { id: "default" },
    });
    const preservedFeishuAppSecret = preserveMaskedSecret(
      feishuAppSecret,
      currentSettings?.feishuAppSecret ?? "",
      env.FEISHU_APP_SECRET,
    );
    const settings = await prisma.feishuSettings.upsert({
      where: { id: "default" },
      update: {
        feishuAppId: feishuAppId ?? "",
        feishuAppSecret: preservedFeishuAppSecret,
        feishuAppToken: feishuAppToken ?? "",
        feishuTableId: feishuTableId ?? "",
        columnMappings: normalizedMappings,
      },
      create: {
        id: "default",
        feishuAppId: feishuAppId ?? "",
        feishuAppSecret: preservedFeishuAppSecret,
        feishuAppToken: feishuAppToken ?? "",
        feishuTableId: feishuTableId ?? "",
        columnMappings: normalizedMappings,
      },
    });

    const backfill = await backfillFeishuSyncForTasks({
      actorId: session.sub,
      mode: "ALL",
    });

    return NextResponse.json({ ok: true, settings, backfill });
  } catch (err) {
    const message = err instanceof Error ? err.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
