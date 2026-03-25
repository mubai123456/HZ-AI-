import { NextResponse } from "next/server";
import { z } from "zod";

import { createBanner, getAllBanners } from "@/lib/db/banners";
import { getCurrentSession } from "@/lib/session";

const createSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  linkLabel: z.string().optional().nullable(),
  bgFrom: z.string().optional(),
  bgTo: z.string().optional(),
  sortOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }

  const items = await getAllBanners();
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
    return NextResponse.json({ error: "Banner 参数不正确" }, { status: 400 });
  }

  try {
    const item = await createBanner(parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建 Banner 失败" },
      { status: 400 },
    );
  }
}
