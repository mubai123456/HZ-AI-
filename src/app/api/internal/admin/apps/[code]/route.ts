import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { deleteAppWithRelationsByCode } from "@/lib/db/apps";
import { backfillFeishuSyncForTasks } from "@/lib/feishu-sync-jobs";
import { normalizeFeishuColumnMappings } from "@/lib/feishu-sync";
import { getAppFeishuSyncSourceKeys } from "@/lib/feishu-sync-fields";
import { parsePriceYuanToFen } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { normalizeRunningHubAllowedChannelCodes } from "@/lib/runninghub-channels";
import { normalizeShowcaseImages } from "@/lib/showcase-images";
import { getCurrentSession } from "@/lib/session";

function normalizeTags(input: unknown) {
  if (!Array.isArray(input)) {
    return undefined;
  }

  return Array.from(new Set(input.map((item) => String(item).trim()).filter(Boolean)));
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { code } = await params;
  const app = await prisma.app.findUnique({
    where: { code },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  return NextResponse.json(app);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { code } = await params;

  try {
    const deleted = await deleteAppWithRelationsByCode(code);
    if (!deleted) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...deleted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { code } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const existingApp =
    body.syncMappingJson !== undefined || body.formSchemaJson !== undefined
      ? await prisma.app.findUnique({
          where: { code },
          select: { formSchemaJson: true },
        })
      : null;

  if ((body.syncMappingJson !== undefined || body.formSchemaJson !== undefined) && !existingApp) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const normalizedTags = normalizeTags(body.tags);
  const normalizedAllowedChannels =
    body.runninghubAllowedChannelCodesJson !== undefined
      ? normalizeRunningHubAllowedChannelCodes(body.runninghubAllowedChannelCodesJson)
      : undefined;
  const normalizedShowcaseImages =
    body.showcaseImages !== undefined ? normalizeShowcaseImages(body.showcaseImages) : undefined;
  const normalizedSyncMapping =
    body.syncMappingJson !== undefined
      ? normalizeFeishuColumnMappings(body.syncMappingJson, {
          allowedSourceKeys: getAppFeishuSyncSourceKeys(
            Array.isArray(body.formSchemaJson)
              ? body.formSchemaJson
              : ((existingApp?.formSchemaJson as Array<{ key: string; label: string }>) ?? []),
          ),
        })
      : undefined;
  let estimatedPriceFen: number | undefined;

  if (body.estimatedPriceYuan !== undefined) {
    try {
      estimatedPriceFen = parsePriceYuanToFen(body.estimatedPriceYuan);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid estimated price" },
        { status: 400 },
      );
    }
  }

  try {
    const app = await prisma.app.update({
      where: { code },
      data: {
        ...(body.code !== undefined && { code: body.code }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.providerAppId !== undefined && { providerAppId: body.providerAppId }),
        ...(body.enabled !== undefined && { enabled: Boolean(body.enabled) }),
        ...(body.shareResults !== undefined && { shareResults: Boolean(body.shareResults) }),
        ...(estimatedPriceFen !== undefined && { estimatedPriceFen }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.formSchemaJson !== undefined && { formSchemaJson: body.formSchemaJson }),
        ...(body.requestMappingJson !== undefined && { requestMappingJson: body.requestMappingJson }),
        ...(body.defaultParamsJson !== undefined && { defaultParamsJson: body.defaultParamsJson }),
        ...(normalizedSyncMapping !== undefined && { syncMappingJson: normalizedSyncMapping }),
        ...(normalizedAllowedChannels !== undefined && {
          runninghubAllowedChannelCodesJson: normalizedAllowedChannels ?? Prisma.JsonNull,
        }),
        ...(body.coverPoster !== undefined && { coverPoster: body.coverPoster }),
        ...(normalizedShowcaseImages !== undefined && { showcaseImagesJson: normalizedShowcaseImages }),
        ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
        ...(body.viewCount !== undefined && { viewCount: Number(body.viewCount) }),
        ...(normalizedTags !== undefined && {
          tags: {
            deleteMany: {},
            create: normalizedTags.map((tagName) => ({
              tag: {
                connectOrCreate: {
                  where: { name: tagName },
                  create: { name: tagName },
                },
              },
            })),
          },
        }),
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    const backfill =
      normalizedSyncMapping !== undefined
        ? await backfillFeishuSyncForTasks({
            appId: app.id,
            actorId: session.sub,
            mode: "ALL",
          })
        : null;

    return NextResponse.json({ ok: true, app, backfill });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 },
    );
  }
}
