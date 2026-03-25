import { NextResponse } from "next/server";
import { z } from "zod";

import { createMaterialTag, getMaterialTags } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问。" }, { status: 403 });
  }

  const items = await getMaterialTags();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "标签名称格式不正确。" }, { status: 400 });
  }

  try {
    const item = await createMaterialTag(parsed.data.name);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建标签失败。" },
      { status: 500 },
    );
  }
}
