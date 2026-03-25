import { NextResponse } from "next/server";

import { pumpQueuedTasks } from "@/lib/task-queue";
import { getCurrentSession } from "@/lib/session";

/**
 * POST /api/internal/tasks/pump
 * Manually trigger the task pump to poll all RUNNING tasks.
 * Accessible by ADMIN users.
 */
export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await pumpQueuedTasks();

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error(`[tasks/pump] Error:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Pump failed" },
      { status: 500 }
    );
  }
}
