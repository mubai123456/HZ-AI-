/**
 * Feishu SDK — Multi-dimensional Table (Bitable) Integration
 *
 * Manages records in a Feishu multi-dimensional table.
 * Uses the Feishu Open Platform API: https://open.feishu.cn
 *
 * Flow:
 *  1. Create a record when a task is submitted (status=QUEUED)
 *  2. Update the record when the task completes (status=SUCCESS/FAILED)
 *
 * The field mapping is defined per-app in app.syncMappingJson, e.g.:
 *   { taskNo: "任务ID", status: "任务状态", providerResultUrl: "结果链接" }
 */

import { env } from "@/lib/env";
import { getResolvedIntegrationSettings } from "@/lib/settings";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeishuTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

export interface FeishuRecord {
  fields: Record<string, unknown>;
}

export interface FeishuCreateRecordResponse {
  code: number;
  msg: string;
  data: {
    record: FeishuRecord;
  };
}

export interface FeishuUpdateRecordResponse {
  code: number;
  msg: string;
}

export interface FeishuTableTarget {
  appToken: string;
  tableId: string;
}

export interface SyncMapping {
  [localField: string]: string; // local field name → Feishu field name
}

// ─── Token Management ────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getTenantAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const integrationSettings = await getResolvedIntegrationSettings();
  const response = await fetch(
    `${integrationSettings.feishuBaseUrl}/open-apis/auth/v3/tenant_access_token/internal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: env.FEISHU_APP_ID,
        app_secret: env.FEISHU_APP_SECRET,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Feishu auth error: ${response.status}`);
  }

  const data: FeishuTokenResponse = await response.json();

  if (data.code !== 0) {
    throw new Error(`Feishu token error: ${data.msg}`);
  }

  cachedToken = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + data.expire * 1000,
  };

  return cachedToken.token;
}

// ─── Internal API Helpers ─────────────────────────────────────────────────────

async function feishuFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getTenantAccessToken();
  const integrationSettings = await getResolvedIntegrationSettings();

  const response = await fetch(`${integrationSettings.feishuBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Feishu API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new record in the Feishu multi-dimensional table.
 * Returns the record ID for future updates.
 */
export async function createRecord(
  target: FeishuTableTarget,
  fields: Record<string, unknown>
): Promise<string> {
  const response = await feishuFetch<FeishuCreateRecordResponse>(
    `/open-apis/bitable/v1/apps/${target.appToken}/tables/${target.tableId}/records`,
    {
      method: "POST",
      body: JSON.stringify({ fields }),
    }
  );

  if (response.code !== 0) {
    throw new Error(`Feishu create record error: ${response.msg}`);
  }

  // Feishu returns the record with its ID in data.record.record_id
  return (response.data.record as unknown as { record_id: string }).record_id;
}

/**
 * Update an existing record in the Feishu multi-dimensional table.
 */
export async function updateRecord(
  target: FeishuTableTarget,
  recordId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const response = await feishuFetch<FeishuUpdateRecordResponse>(
    `/open-apis/bitable/v1/apps/${target.appToken}/tables/${target.tableId}/records/${recordId}`,
    {
      method: "PUT",
      body: JSON.stringify({ fields }),
    }
  );

  if (response.code !== 0) {
    throw new Error(`Feishu update record error: ${response.msg}`);
  }
}

/**
 * Map a local task record to Feishu fields using the app's syncMappingJson.
 *
 * Example:
 *   syncMapping = { taskNo: "任务ID", status: "任务状态", providerResultUrl: "结果链接" }
 *   task = { taskNo: "TASK-001", status: "SUCCESS", providerResultUrl: "https://..." }
 *   → fields = { "任务ID": "TASK-001", "任务状态": "SUCCESS", "结果链接": "https://..." }
 */
export function mapToFeishuFields(
  syncMapping: SyncMapping,
  taskData: Record<string, unknown>
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  for (const [localField, feishuField] of Object.entries(syncMapping)) {
    if (localField in taskData) {
      const value = taskData[localField];
      // Only include fields with non-null/undefined/non-empty-string values to avoid
      // Feishu "FieldNameNotFound" errors when the field doesn't exist in the table
      if (value !== null && value !== undefined && value !== "") {
        fields[feishuField] = value;
      }
    }
  }

  return fields;
}
