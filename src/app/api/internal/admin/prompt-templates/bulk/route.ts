import { PromptTemplateScopeMode } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { bulkOperatePromptTemplates } from "@/lib/db/prompt-templates";
import { getCurrentSession } from "@/lib/session";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("setEnabled"), enabled: z.boolean() }),
    z.object({ type: z.literal("setCategory"), categoryId: z.string().nullable() }),
    z.object({ type: z.literal("setTags"), tags: z.array(z.string()) }),
    z.object({
      type: z.literal("setScope"),
      scopeMode: z.nativeEnum(PromptTemplateScopeMode),
      scopeAppCodes: z.array(z.string()).optional(),
    }),
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

  const result = await bulkOperatePromptTemplates({
    ids: parsed.data.ids,
    action: parsed.data.action,
  });

  return NextResponse.json(result);
}
