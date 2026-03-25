import { PromptTemplateMediaType, PromptTemplateScopeMode } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  deletePromptTemplate,
  getAdminPromptTemplateById,
  updatePromptTemplate,
} from "@/lib/db/prompt-templates";
import { getCurrentSession } from "@/lib/session";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const item = await getAdminPromptTemplateById(id);
  if (!item) {
    return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PUT(
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
    const item = await updatePromptTemplate(id, {
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
      scopeAppCodes: Array.isArray(body.scopeAppCodes) ? body.scopeAppCodes : undefined,
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存模板失败";
    const status = message === "模板不存在" ? 404 : 400;
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
    await deletePromptTemplate(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  }
}
