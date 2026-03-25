import { NextResponse } from "next/server";

import { getResolvedSiteSettings, saveSiteSettings, siteSettingsUpdateSchema } from "@/lib/settings";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getResolvedSiteSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = siteSettingsUpdateSchema.parse(body);
    await saveSiteSettings(parsed);

    return NextResponse.json({
      ok: true,
      settings: await getResolvedSiteSettings(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
