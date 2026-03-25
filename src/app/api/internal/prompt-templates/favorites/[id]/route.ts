import { NextResponse } from "next/server";

import { togglePromptTemplateFavorite } from "@/lib/db/prompt-templates";
import { getCurrentSession } from "@/lib/session";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await togglePromptTemplateFavorite({
    userId: session.sub,
    templateId: id,
    favorite: true,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await togglePromptTemplateFavorite({
    userId: session.sub,
    templateId: id,
    favorite: false,
  });

  return NextResponse.json({ ok: true });
}
