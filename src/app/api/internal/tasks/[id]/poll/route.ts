import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { pumpTask } from "@/lib/task-queue";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      createdById: true,
      providerTaskId: true,
      status: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (session.role !== "ADMIN" && task.createdById !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!task.providerTaskId) {
    return NextResponse.json({ error: "Task has no providerTaskId yet (still QUEUED)" }, { status: 400 });
  }

  if (task.status === "SUCCEEDED" || task.status === "FAILED") {
    return NextResponse.json({ message: "Task already terminal", status: task.status });
  }

  try {
    const result = await pumpTask(task.providerTaskId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Poll failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
