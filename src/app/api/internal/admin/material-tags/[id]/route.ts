import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteMaterialTag, updateMaterialTag } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(40),
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
    return NextResponse.json({ error: "标签名称格式不正确。" }, { status: 400 });
  }

  try {
    const { id } = await params;
    const item = await updateMaterialTag({
      tagId: id,
      name: parsed.data.name,
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新标签失败。" },
      { status: 400 },
    );
  }
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
  const result = await deleteMaterialTag({ tagId: id });

  if (!result.ok) {
    return NextResponse.json({ error: "未找到对应标签。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
