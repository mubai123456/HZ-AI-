import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { normalizeFeishuColumnMappings } from "@/lib/feishu-sync";
import { getAppFeishuSyncSourceKeys } from "@/lib/feishu-sync-fields";
import { parsePriceYuanToFen } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { normalizeRunningHubAllowedChannelCodes } from "@/lib/runninghub-channels";
import { normalizeShowcaseImages } from "@/lib/showcase-images";
import { getCurrentSession } from "@/lib/session";

function normalizeTags(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(new Set(input.map((item) => String(item).trim()).filter(Boolean)));
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "请求体格式不正确" }, { status: 400 });
  }

  const {
    code,
    name,
    description,
    provider = "RUNNINGHUB",
    providerAppId,
    enabled = true,
    shareResults = false,
    category = null,
    tags = [],
    formSchemaJson = [],
    requestMappingJson = {},
    defaultParamsJson = {},
    syncMappingJson = {},
    runninghubAllowedChannelCodesJson = null,
    coverPoster = null,
    showcaseImages = [],
    estimatedPriceYuan,
    sortOrder = 0,
    viewCount = 0,
  } = body;

  if (!code || !name || !providerAppId) {
    return NextResponse.json({ error: "缺少必填字段：code、name、providerAppId" }, { status: 400 });
  }

  const existing = await prisma.app.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: `应用标识 ${code} 已存在` }, { status: 409 });
  }

  const normalizedTags = normalizeTags(tags);
  const normalizedAllowedChannels = normalizeRunningHubAllowedChannelCodes(
    runninghubAllowedChannelCodesJson,
  );
  const normalizedShowcaseImages = normalizeShowcaseImages(showcaseImages);
  const normalizedSyncMapping = normalizeFeishuColumnMappings(syncMappingJson, {
    allowedSourceKeys: getAppFeishuSyncSourceKeys(formSchemaJson),
  });
  let estimatedPriceFen = 0;

  try {
    estimatedPriceFen = parsePriceYuanToFen(estimatedPriceYuan);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "预计费用格式不正确" },
      { status: 400 },
    );
  }

  try {
    const app = await prisma.app.create({
      data: {
        code,
        name,
        description: description ?? "",
        provider,
        providerAppId,
        enabled,
        shareResults: Boolean(shareResults),
        estimatedPriceFen,
        category,
        formSchemaJson,
        requestMappingJson,
        defaultParamsJson,
        syncMappingJson: normalizedSyncMapping,
        runninghubAllowedChannelCodesJson:
          normalizedAllowedChannels ?? Prisma.JsonNull,
        coverPoster,
        showcaseImagesJson: normalizedShowcaseImages,
        sortOrder: Number(sortOrder),
        viewCount: Number(viewCount),
        tags: {
          create: normalizedTags.map((tagName) => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName },
              },
            },
          })),
        },
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    return NextResponse.json({ ok: true, app }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 },
    );
  }
}
