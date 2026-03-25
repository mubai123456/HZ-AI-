import { NextResponse } from "next/server";

import { getUserMaterialQuota } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quota = await getUserMaterialQuota(session.sub);
  return NextResponse.json(quota);
}
