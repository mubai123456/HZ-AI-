/**
 * Local Polling Script
 *
 * Runs pumpQueuedTasks every 30 seconds to poll RunningHub for task status updates.
 * This is for local development when webhook is not accessible from RunningHub.
 *
 * Usage: npx tsx local-poll.ts
 */

import "dotenv/config";
import { pumpQueuedTasks } from "./src/lib/task-queue";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

async function poll() {
  const now = new Date().toISOString();
  console.log(`[${now}] Polling RUNNING tasks...`);

  try {
    const results = await pumpQueuedTasks();

    if (results.length > 0) {
      console.log(`  Processed ${results.length} tasks:`);
      for (const r of results) {
        console.log(`    - ${r.taskId}: ${r.newStatus}${r.errorMessage ? ` (${r.errorMessage})` : ""}`);
      }
    } else {
      console.log("  No tasks需要更新");
    }
  } catch (err) {
    console.error("  Polling error:", err instanceof Error ? err.message : err);
  }
}

console.log("===========================================");
console.log("本地轮询脚本启动 - 每30秒检查一次任务状态");
console.log("按 Ctrl+C 停止");
console.log("===========================================\n");

// Run immediately once
poll();

// Then run every 30 seconds
setInterval(poll, POLL_INTERVAL_MS);
