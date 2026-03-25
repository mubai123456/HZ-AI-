import type { BulkOperationItem, BulkOperationResult } from "@/lib/types";

export function buildBulkOperationResult(results: BulkOperationItem[]): BulkOperationResult {
  return {
    results,
    summary: {
      totalCount: results.length,
      successCount: results.filter((item) => item.status === "success").length,
      skippedCount: results.filter((item) => item.status === "skipped").length,
      failureCount: results.filter((item) => item.status === "failed").length,
    },
  };
}
