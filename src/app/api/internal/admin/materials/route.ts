import { NextResponse } from "next/server";

import { getAdminMaterials } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await getAdminMaterials();
  return NextResponse.json({ items });
}
