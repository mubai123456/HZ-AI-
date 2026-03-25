import { NextResponse } from "next/server";
import { z } from "zod";

import { bulkOperateMaterials } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

const bulkSchema = z.object({
  materialIds: z.array(z.string().trim().min(1)).min(1),
  action: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("updateTags"),
      tags: z.array(z.string().trim().min(1).max(40)),
    }),
    z.object({
      type: z.literal("changeStatus"),
      status: z.enum(["AVAILABLE", "OFF_SHELF"]),
    }),
    z.object({
      type: z.literal("delete"),
    }),
    z.object({
      type: z.literal("resetClaims"),
      reason: z.string().max(200).optional().nullable(),
    }),
  ]),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "批量操作参数不正确。" }, { status: 400 });
  }

  const result = await bulkOperateMaterials({
    actorId: session.sub,
    materialIds: parsed.data.materialIds,
    action: parsed.data.action,
  });

  return NextResponse.json(result);
}
