import { NextResponse } from "next/server";

import { getAvailableMaterials } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const items = await getAvailableMaterials({
    search: searchParams.get("q") ?? undefined,
    materialType: (searchParams.get("type") as "VIDEO" | "IMAGE" | "ALL" | null) ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
  });

  return NextResponse.json({ items });
}
