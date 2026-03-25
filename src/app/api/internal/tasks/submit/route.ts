import { NextResponse } from "next/server";

import { submitNewTask } from "@/lib/task-queue";
import { getCurrentSession } from "@/lib/session";

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

    return NextResponse.json({ ok: true, taskId: result.taskId, taskNo: result.taskNo });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submit failed";
    console.error(`[tasks/submit] Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
