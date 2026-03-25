import { NextResponse } from "next/server";

import { getEnabledApps } from "@/lib/db/apps";

export async function GET() {
  const items = await getEnabledApps();
  return NextResponse.json({ items });
}
