import { NextResponse } from "next/server";

import { getMyClaimedMaterials } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const items = await getMyClaimedMaterials(session.sub);
  return NextResponse.json({ items });
}
