import { NextResponse } from "next/server";
import { z } from "zod";

import { bulkOperateBanners } from "@/lib/db/banners";
import { getCurrentSession } from "@/lib/session";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("setEnabled"), enabled: z.boolean() }),
    z.object({ type: z.literal("setSortOrder"), startSortOrder: z.number().int() }),
    z.object({ type: z.literal("delete") }),
  ]),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "批量操作参数不正确" }, { status: 400 });
  }

  const result = await bulkOperateBanners({
    ids: parsed.data.ids,
    action: parsed.data.action,
  });

  return NextResponse.json(result);
}
