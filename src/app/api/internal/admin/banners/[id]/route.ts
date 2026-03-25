import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteBanner, updateBanner } from "@/lib/db/banners";
import { getCurrentSession } from "@/lib/session";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  linkLabel: z.string().optional().nullable(),
  bgFrom: z.string().optional(),
  bgTo: z.string().optional(),
  sortOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Banner 更新参数不正确" }, { status: 400 });
  }

  try {
    const { id } = await params;
    const item = await updateBanner(id, parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新 Banner 失败" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await deleteBanner(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除 Banner 失败" },
      { status: 400 },
    );
  }
}
