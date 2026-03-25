import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    { error: "请改用 /api/internal/admin/prompt-templates" },
    { status: 410 },
  );
}

export async function POST() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    { error: "请改用 /api/internal/admin/prompt-templates" },
    { status: 410 },
  );
}
