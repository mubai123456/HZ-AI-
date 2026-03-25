import { NextResponse } from "next/server";

import { deletePromptTag, updatePromptTag } from "@/lib/db/prompt-templates";
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
    const item = await updatePromptTag(id, {
      name: body.name,
      color: body.color,
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新标签失败";
    const status = message === "标签不存在" ? 404 : 400;
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
    await deletePromptTag(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除标签失败";
    const status = message === "标签不存在" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
