/**
 * Server-Sent Events (SSE) Emitter
 *
 * Provides real-time task status updates to connected browser clients.
 *
 * Usage:
 *  1. Client subscribes to /api/internal/sse?taskId=xxx
 *  2. When task status changes, call emitTaskUpdate(taskId, data)
 *  3. All subscribed clients receive the update via EventSource
 *
 * In Next.js App Router, SSE is implemented as a ReadableStream Response.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TaskUpdateEvent {
  taskId: string;
  status: string;
  providerStatus?: string;
  providerResultUrl?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

// ─── Client Registry ─────────────────────────────────────────────────────────

type Subscriber = (data: TaskUpdateEvent) => void;

/**
 * In-process subscriber registry.
 * Key: taskId, Value: Set of subscriber callbacks.
 *
 * Note: In Next.js serverless (single-shot request model), each
 * API call starts a fresh process. For true SSE across instances,
 * this would need Redis pub/sub or similar. For MVP on a single
 * Vercel instance, this in-memory map works fine.
 */
const subscribers = new Map<string, Set<Subscriber>>();

/**
 * Global subscribers - receive ALL task updates regardless of taskId.
 * Used for clients that want to refresh task lists on any update.
 */
const globalSubscribers = new Set<Subscriber>();

/**
 * Subscribe to task updates. Returns a cleanup function.
 */
export function subscribeToTask(
  taskId: string,
  callback: Subscriber
): () => void {
  if (!subscribers.has(taskId)) {
    subscribers.set(taskId, new Set());
  }
  subscribers.get(taskId)!.add(callback);

  return () => {
    subscribers.get(taskId)?.delete(callback);
    if (subscribers.get(taskId)?.size === 0) {
      subscribers.delete(taskId);
    }
  };
}

/**
 * Subscribe to ALL task updates. Returns a cleanup function.
 */
export function subscribeToAll(callback: Subscriber): () => void {
  globalSubscribers.add(callback);
  return () => {
    globalSubscribers.delete(callback);
  };
}

/**
 * Broadcast an update to all subscribers of a task.
 */
export function emitTaskUpdate(event: TaskUpdateEvent): void {
  // Send to specific task subscribers
  const subs = subscribers.get(event.taskId);
  if (subs) {
    for (const callback of subs) {
      try {
        callback(event);
      } catch {
        // Subscriber may have disconnected; ignore
      }
    }
  }

  // Also send to global subscribers
  for (const callback of globalSubscribers) {
    try {
      callback(event);
    } catch {
      // Subscriber may have disconnected; ignore
    }
  }
}

// ─── SSE Response Generator ───────────────────────────────────────────────────

/**
 * Create a ReadableStream-based SSE response for Next.js App Router.
 *
 * Client usage:
 *   const es = new EventSource('/api/internal/sse?taskId=' + taskId);
 *   es.onmessage = (e) => console.log(JSON.parse(e.data));
 */
export function createSSEStream(
  taskId: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      // Send initial heartbeat to confirm connection
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", taskId })}\n\n`)
      );

      // Subscribe and forward events
      const unsubscribe = subscribeToTask(taskId, (event) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Controller may already be closed
          unsubscribe();
        }
      });

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 30_000);

      // Cleanup on client disconnect (controller.close() triggers cancel)
      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
  });
}

/**
 * Create a global SSE stream that receives ALL task updates.
 * Useful for refreshing task lists without knowing specific taskIds.
 */
export function createGlobalSSEStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      // Send initial heartbeat to confirm connection
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", scope: "all" })}\n\n`)
      );

      // Subscribe and forward all events
      const unsubscribe = subscribeToAll((event) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Controller may already be closed
          unsubscribe();
        }
      });

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 30_000);

      // Cleanup on client disconnect
      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
  });
}
