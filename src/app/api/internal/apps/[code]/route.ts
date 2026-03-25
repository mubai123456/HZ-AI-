import { NextResponse } from "next/server";

import { getAppByCode } from "@/lib/db/apps";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const app = await getAppByCode(code);

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  return NextResponse.json(app);
}
