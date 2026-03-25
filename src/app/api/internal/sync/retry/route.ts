import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncTaskToFeishu } from "@/lib/task-queue";
import { getCurrentSession } from "@/lib/session";

/**
 * POST /api/internal/sync/retry
 * Retry Feishu sync for a specific task.
 */
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { taskId, actorId } = body as { taskId: string; actorId?: string };

    if (!taskId) {
      return NextResponse.json(
        { ok: false, error: "taskId is required" },
        { status: 400 }
      );
    }

    // Fetch the task
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json(
        { ok: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Rate limit: check the most recent SyncLog entry
    const latestSyncLog = await prisma.syncLog.findFirst({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });

    if (latestSyncLog) {
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
      if (latestSyncLog.createdAt > sixtySecondsAgo) {
        return NextResponse.json(
          {
            ok: false,
            error: "Sync retry rate limited: please wait 60 seconds between retries",
          },
          { status: 429 }
        );
      }
    }

    // Determine action: create if no feishuRecordId, otherwise update
    const action = task.feishuRecordId ? "update" : "create";

    // Perform the sync
    const result = await syncTaskToFeishu(taskId, action, actorId);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[sync/retry] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
