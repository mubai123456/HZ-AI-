import { NextResponse } from "next/server";
import crypto from "crypto";

import { env } from "@/lib/env";
import { handleWebhook, type RunningHubWebhookPayload } from "@/lib/task-queue";

/**
 * Verify the webhook request signature.
 * RunningHub signs requests using HMAC-SHA256 with the shared secret.
 * The signature is sent in the X-RunningHub-Signature header.
 */
async function verifyWebhookSignature(
  request: Request,
  rawBody: string
): Promise<boolean> {
  const secret = env.RUNNINGHUB_WEBHOOK_SECRET;

  // If no secret is configured, reject in production
  if (!secret) {
    if (env.NODE_ENV === "production") {
      throw new Error("[webhook] RUNNINGHUB_WEBHOOK_SECRET not configured in production");
    }
    console.warn("[webhook] RUNNINGHUB_WEBHOOK_SECRET not configured, skipping signature verification");
    return true;
  }

  const signature = request.headers.get("X-RunningHub-Signature");
  if (!signature) {
    console.warn("[webhook] Missing X-RunningHub-Signature header");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * RunningHub Webhook Callback
 *
 * RunningHub POSTs here when a task completes (or fails).
 * This endpoint is called by RunningHub's servers — NOT by our frontend.
 */
export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify signature before processing
    const isValid = await verifyWebhookSignature(request, rawBody);
    if (!isValid) {
      console.warn("[webhook] Invalid signature rejected");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: RunningHubWebhookPayload = JSON.parse(rawBody);

    if (payload.event !== "TASK_END") {
      return NextResponse.json({ ok: true, message: "Ignored non-TASK_END event" });
    }

    await handleWebhook(payload);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[webhook] Error:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
