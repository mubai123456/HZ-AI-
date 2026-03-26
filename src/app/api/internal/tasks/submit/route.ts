import { NextResponse } from "next/server";

import { getTaskById } from "@/lib/db/tasks";
import { submitNewTask } from "@/lib/task-queue";
import { getCurrentSession } from "@/lib/session";
import { sanitizeUserFacingError } from "@/lib/user-facing-errors";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { appCode, formData, selectedPromptTemplateId } = body as {
      appCode: string;
      formData: Record<string, string | string[]>;
      selectedPromptTemplateId?: string;
    };

    if (!appCode || !formData) {
      return NextResponse.json({ error: "Missing appCode or formData" }, { status: 400 });
    }

    const result = await submitNewTask({
      appCode,
      formData,
      selectedPromptTemplateId,
      userId: session.sub,
    });

    const task = await getTaskById(result.taskId, {
      role: session.role,
      userId: session.sub,
    });

    return NextResponse.json({ ok: true, ...result, task });
  } catch (err) {
    console.error(`[tasks/submit] Error:`, err);
    return NextResponse.json({ error: sanitizeUserFacingError(err, "submit") }, { status: 500 });
  }
}
