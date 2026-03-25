import { PromptTemplateMediaType, PromptTemplateScopeMode } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  createPromptTemplate,
  listAdminPromptTemplates,
} from "@/lib/db/prompt-templates";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await listAdminPromptTemplates();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const item = await createPromptTemplate({
      appCode: body.appCode,
      categoryId: body.categoryId,
      name: body.name,
      description: body.description,
      coverImageUrl: body.coverImageUrl,
      sampleMediaType: body.sampleMediaType as PromptTemplateMediaType | undefined,
      sampleMediaUrl: body.sampleMediaUrl,
      samplePosterUrl: body.samplePosterUrl,
      templatePrompt: body.templatePrompt,
      tags: body.tags,
      enabled: body.enabled,
      scopeMode: body.scopeMode as PromptTemplateScopeMode | undefined,
      scopeAppCodes: Array.isArray(body.scopeAppCodes) ? body.scopeAppCodes : [],
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建模板失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
