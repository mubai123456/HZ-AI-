import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { pumpTask } from "@/lib/task-queue";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const dbTask = await prisma.task.findUnique({
    where: { id },
    include: { app: true },
  });

  if (!dbTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (session.role !== "ADMIN" && dbTask.createdById !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!dbTask.providerTaskId) {
    return NextResponse.json({ error: "No provider task ID" }, { status: 400 });
  }

  try {
    const result = await pumpTask(dbTask.providerTaskId);
    return NextResponse.json({
      ok: true,
      status: result.newStatus,
      providerStatus: result.newStatus,
      providerResultUrl: result.providerResultUrl ?? null,
    });
  } catch (error) {
    console.error("[tasks/refresh] Failed to query task:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "查询任务失败" },
      { status: 500 },
    );
  }
}
