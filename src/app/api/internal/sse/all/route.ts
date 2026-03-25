import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { subscribeToAll } from "@/lib/sse";

function buildHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const isAdmin = session.role === "ADMIN";

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", scope: "all" })}\n\n`));

      const unsubscribe = subscribeToAll(async (event) => {
        if (closed) {
          return;
        }

        if (isAdmin) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "task-changed" })}\n\n`));
          return;
        }

        const task = await prisma.task.findUnique({
          where: { id: event.taskId },
          select: {
            createdById: true,
          },
        });

        if (!task || task.createdById !== session.sub) {
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "task-changed" })}\n\n`));
      });

      const heartbeat = setInterval(() => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30_000);

      (this as { cleanup?: () => void }).cleanup = () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel() {
      (this as { cleanup?: () => void }).cleanup?.();
    },
  });

  return new Response(stream, { headers: buildHeaders() });
}
