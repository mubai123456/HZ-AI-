import { NextResponse } from "next/server";

import { pumpQueuedTasks } from "@/lib/task-queue";
import { getCurrentSession } from "@/lib/session";

/**
 * Task Polling Endpoint (Cron Fallback)
 *
 * Periodically polls all RUNNING tasks to check their status with RunningHub.
 * This is a fallback mechanism — the primary completion path is the webhook.
 *
 * Vercel Cron configuration (vercel.json):
 * {
 *   "crons": [{ "path": "/api/internal/tasks/poll", "schedule": "* * * * *" }]
 * }
 *
 * Called by: Vercel cron job or external scheduler (e.g. GitHub Actions cron)
 * Auth: Uses X-Vercel-Cron header or internal network call.
 */
export async function POST(request: Request) {
  // Verify cron auth (Vercel sets this header for cron jobs)
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const isCronRequest = vercelCronHeader === "1";

  if (!isCronRequest) {
    const session = await getCurrentSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const results = await pumpQueuedTasks();

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error(`[tasks/poll] Error:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Poll failed" },
      { status: 500 }
    );
  }
}
