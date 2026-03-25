import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getTaskById } from "@/lib/db/tasks";
import { getCurrentSession } from "@/lib/session";
import { cancelTask } from "@/lib/task-queue";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const task = await getTaskById(id, {
    role: session.role,
    userId: session.sub,
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function DELETE(
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
    select: { id: true, createdById: true },
  });

  if (!dbTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (session.role !== "ADMIN" && dbTask.createdById !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await cancelTask(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
