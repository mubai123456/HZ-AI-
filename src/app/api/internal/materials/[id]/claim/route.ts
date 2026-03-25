import { NextResponse } from "next/server";
import { z } from "zod";

import { claimMaterialForUser } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

const claimSchema = z.object({
  claimRequestId: z.string().min(1).max(120).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = claimSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "领取请求格式不正确" }, { status: 400 });
  }

  const result = await claimMaterialForUser({
    materialId: id,
    userId: session.sub,
    claimRequestId: parsed.data.claimRequestId,
  });

  if (!result.ok) {
    const status =
      result.error === "material_not_found"
        ? 404
        : result.error === "quota_exceeded"
          ? 429
          : result.error === "already_claimed"
            ? 409
            : 400;

    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
