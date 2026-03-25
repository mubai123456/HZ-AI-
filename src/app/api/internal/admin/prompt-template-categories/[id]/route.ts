import { NextResponse } from "next/server";

import {
  deletePromptTemplateCategory,
  updatePromptTemplateCategory,
} from "@/lib/db/prompt-templates";
import { getCurrentSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id } = await params;
    const item = await updatePromptTemplateCategory(id, {
      name: body.name,
      color: body.color,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新分类失败";
    const status = message === "分类不存在" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await deletePromptTemplateCategory(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除分类失败";
    const status = message === "分类不存在" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
