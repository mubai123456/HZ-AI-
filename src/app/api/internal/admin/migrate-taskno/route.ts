import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

/**
 * Migration: update taskNo to use RunningHub's providerTaskId.
 * Fixes legacy tasks that were created before the fix with local CUID taskNo.
 */
export async function POST() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all tasks that have a providerTaskId but taskNo still looks like local format
  const tasks = await prisma.task.findMany({
    where: {
      providerTaskId: { not: null },
      taskNo: { startsWith: "TASK-" },
    },
  });

  let updated = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    if (!task.providerTaskId) continue;

    // Check for conflicts: another task already has this providerTaskId as taskNo
    const conflict = await prisma.task.findFirst({
      where: {
        taskNo: task.providerTaskId,
        id: { not: task.id },
      },
    });

    if (conflict) {
      errors.push(`Task ${task.id}: providerTaskId ${task.providerTaskId} already used by task ${conflict.id}`);
      continue;
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { taskNo: task.providerTaskId },
    });
    updated++;
  }

  return NextResponse.json({ ok: true, updated, errors: errors.length > 0 ? errors : undefined });
}
