import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createSSEStream } from "@/lib/sse";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return new Response("Missing taskId", { status: 400 });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      createdById: true,
    },
  });

  if (!task) {
    return new Response("Task not found", { status: 404 });
  }

  const canSee = session.role === "ADMIN" || task.createdById === session.sub;
  if (!canSee) {
    return new Response("Forbidden", { status: 403 });
  }

  const stream = createSSEStream(taskId);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
