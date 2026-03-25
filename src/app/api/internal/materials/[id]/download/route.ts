import { NextResponse } from "next/server";

import { issueDownloadForMaterial } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const result = await issueDownloadForMaterial({
    materialId: id,
    userId: session.sub,
    role: session.role,
  });

  if (!result) {
    return NextResponse.json({ error: "当前无法下载该素材" }, { status: 404 });
  }

  return NextResponse.json(result);
}
