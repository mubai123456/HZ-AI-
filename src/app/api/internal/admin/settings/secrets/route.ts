import { NextResponse } from "next/server";

import { getSecretStatusItems } from "@/lib/settings";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    items: await getSecretStatusItems(),
  });
}
