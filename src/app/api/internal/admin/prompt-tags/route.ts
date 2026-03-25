import { NextResponse } from "next/server";

import { createPromptTag, listPromptTags } from "@/lib/db/prompt-templates";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tags = await listPromptTags();
  return NextResponse.json({ items: tags });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const tag = await createPromptTag({
      name: body.name,
      color: body.color,
    });

    return NextResponse.json({ item: tag }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建标签失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
