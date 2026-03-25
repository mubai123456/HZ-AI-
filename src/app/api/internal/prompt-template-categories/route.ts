import { NextResponse } from "next/server";

import { listPromptTemplateCategories } from "@/lib/db/prompt-templates";
import { getCurrentSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const appCode = searchParams.get("appCode");

  const items = await listPromptTemplateCategories({
    appCode: appCode || undefined,
    enabledOnly: true,
  });

  return NextResponse.json({ items });
}
