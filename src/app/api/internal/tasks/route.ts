import { NextRequest, NextResponse } from "next/server";

import { getTasksForUser } from "@/lib/db/tasks";
import { getCurrentSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const appCode = searchParams.get("appCode") ?? undefined;

  const tasks = await getTasksForUser(session.role, session.sub, {
    appCode,
    limit: 100,
  });

  return NextResponse.json({ tasks });
}
