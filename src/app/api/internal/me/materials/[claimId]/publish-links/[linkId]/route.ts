import { NextResponse } from "next/server";

import { deletePublishLinkForClaim } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ claimId: string; linkId: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { claimId, linkId } = await params;
  const ok = await deletePublishLinkForClaim({
    claimId,
    linkId,
    userId: session.sub,
  });

  if (!ok) {
    return NextResponse.json({ error: "删除失败或记录不存在" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
