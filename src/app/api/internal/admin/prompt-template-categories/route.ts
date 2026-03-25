import { NextResponse } from "next/server";

import {
  createPromptTemplateCategory,
  listPromptTemplateCategories,
} from "@/lib/db/prompt-templates";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await listPromptTemplateCategories();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const item = await createPromptTemplateCategory({
      name: body.name,
      color: body.color,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建分类失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
