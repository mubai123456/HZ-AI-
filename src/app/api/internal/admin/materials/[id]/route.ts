import { NextResponse } from "next/server";
import { z } from "zod";

import { softDeleteMaterial, updateMaterialEntry } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(["UPLOADING", "PROCESSING", "AVAILABLE", "CLAIMED", "OFF_SHELF", "ARCHIVED"]).optional(),
  previewReady: z.boolean().optional(),
  batchNo: z.string().max(80).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "素材更新参数不正确。" }, { status: 400 });
  }

  const { id } = await params;
  await updateMaterialEntry({
    materialId: id,
    actorId: session.sub,
    ...parsed.data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问。" }, { status: 403 });
  }

  const { id } = await params;
  await softDeleteMaterial({
    materialId: id,
    actorId: session.sub,
  });

  return NextResponse.json({ ok: true });
}
