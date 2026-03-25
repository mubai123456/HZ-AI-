import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/session";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "提示词模板使用次数已改为服务端自动统计" },
    { status: 410 },
  );
}
