import { NextResponse } from "next/server";
import { z } from "zod";

import { createCategory, getAllCategories } from "@/lib/db/categories";
import { getCurrentSession } from "@/lib/session";

const createSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }

  const items = await getAllCategories();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "分类参数不正确" }, { status: 400 });
  }

  try {
    const item = await createCategory(parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建分类失败" },
      { status: 400 },
    );
  }
}
