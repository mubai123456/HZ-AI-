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
  const { feishuAppToken, feishuTableId, columnMappings } = body;
  const normalizedMappings = mappingRecordToEntries(
    normalizeFeishuColumnMappings(columnMappings),
  );

  try {
    const settings = await prisma.feishuSettings.upsert({
      where: { id: "default" },
      update: {
        feishuAppToken: feishuAppToken ?? "",
        feishuTableId: feishuTableId ?? "",
        columnMappings: normalizedMappings,
      },
      create: {
        id: "default",
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
