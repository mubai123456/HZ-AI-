import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/session";
import { getUserById } from "@/lib/db/users";
import { updateUserDailyClaimLimit } from "@/lib/db/materials";

const quotaSchema = z.object({
  dailyClaimLimit: z.number().int().min(0).max(100),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = quotaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quota payload" }, { status: 400 });
  }

  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await updateUserDailyClaimLimit({
    userId: id,
    limit: parsed.data.dailyClaimLimit,
    operatorId: session.sub,
  });

  return NextResponse.json({
    item: {
      id: updated.id,
      dailyClaimLimit: updated.dailyClaimLimit,
    },
  });
}
