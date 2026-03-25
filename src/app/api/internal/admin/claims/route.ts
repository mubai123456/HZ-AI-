import { NextResponse } from "next/server";

import { getAdminMaterialClaimLogs } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await getAdminMaterialClaimLogs();
  return NextResponse.json({ items });
}
