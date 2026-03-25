import { NextResponse } from "next/server";

import { listPromptTags } from "@/lib/db/prompt-templates";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listPromptTags();
  return NextResponse.json({ items });
}
