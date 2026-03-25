import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/session";

export async function POST() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }

  return NextResponse.json({
    provider: "local-upload",
    mode: "browser-direct-upload",
    message: "当前环境使用本地批量上传。生产环境可替换为 OSS/COS 临时凭证。",
  });
}
