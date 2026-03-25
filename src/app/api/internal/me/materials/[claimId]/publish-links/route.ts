import { NextResponse } from "next/server";
import { z } from "zod";

import { addPublishLinkForClaim } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

const createSchema = z.object({
  url: z.string().url().max(500),
  platform: z.string().max(80).optional().nullable(),
  note: z.string().max(200).optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "发布链接格式不正确" }, { status: 400 });
  }

  const { claimId } = await params;
  const link = await addPublishLinkForClaim({
    claimId,
    userId: session.sub,
    url: parsed.data.url,
    platform: parsed.data.platform ?? null,
    note: parsed.data.note ?? null,
  });

  if (!link) {
    return NextResponse.json({ error: "未找到对应的素材领取记录" }, { status: 404 });
  }

  return NextResponse.json({ item: link }, { status: 201 });
}
