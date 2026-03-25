import { NextResponse } from "next/server";
import { z } from "zod";

import { resetClaimedMaterialByAdmin } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

const resetSchema = z.object({
  reason: z.string().max(200).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "重置参数不正确" }, { status: 400 });
  }

  const { id } = await params;
  const result = await resetClaimedMaterialByAdmin({
    materialId: id,
    adminUserId: session.sub,
    reason: parsed.data.reason,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "素材当前无法重置" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
