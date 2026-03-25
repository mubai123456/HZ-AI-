import { NextResponse } from "next/server";

import { listUserPromptTemplates } from "@/lib/db/prompt-templates";
import { getCurrentSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const appCode = searchParams.get("appCode");

  if (!appCode) {
    return NextResponse.json({ error: "缺少应用编码" }, { status: 400 });
  }

  const items = await listUserPromptTemplates({
    userId: session.sub,
    appCode,
    mode: (searchParams.get("mode") as "all" | "recent" | "favorites" | null) ?? "all",
    tag: searchParams.get("tag"),
    category: searchParams.get("category"),
    q: searchParams.get("q"),
    sort: (searchParams.get("sort") as "usage" | "latest" | null) ?? "usage",
  });

  return NextResponse.json({ items });
}
