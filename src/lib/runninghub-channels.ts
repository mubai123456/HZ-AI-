import { env } from "@/lib/env";
import { isValidEnvKeyName } from "@/lib/env-key-names";
import type { RunningHubChannelConfig } from "@/lib/types";

export const LEGACY_RUNNINGHUB_CHANNEL_CODE = "consumer";
export const LEGACY_RUNNINGHUB_CHANNEL_NAME = "消费级 API";
export const LEGACY_RUNNINGHUB_API_ENV = "RUNNINGHUB_API_KEY";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePositiveInteger(value: unknown, fallback: number, max: number) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) {
    return fallback;
  }

  return Math.min(numeric, max);
}

export function buildLegacyRunningHubChannel(
  concurrencyLimit = env.TASK_MAX_CONCURRENCY,
): RunningHubChannelConfig {
  return {
    code: LEGACY_RUNNINGHUB_CHANNEL_CODE,
    name: LEGACY_RUNNINGHUB_CHANNEL_NAME,
    apiKeyEnvName: LEGACY_RUNNINGHUB_API_ENV,
    concurrencyLimit: normalizePositiveInteger(concurrencyLimit, env.TASK_MAX_CONCURRENCY, 1000),
    priority: 1,
    enabled: true,
  };
}

export function normalizeRunningHubChannels(
  input: unknown,
  options?: { legacyConcurrencyLimit?: number },
): RunningHubChannelConfig[] {
  const fallbackChannel = buildLegacyRunningHubChannel(options?.legacyConcurrencyLimit);
  if (!Array.isArray(input)) {
    return [fallbackChannel];
  }

  const seenCodes = new Set<string>();
  const channels = input
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const code = normalizeText(record.code);
      const name = normalizeText(record.name);
      const apiKeyEnvName = normalizeText(record.apiKeyEnvName);
      if (!code || !name || !apiKeyEnvName || !isValidEnvKeyName(apiKeyEnvName) || seenCodes.has(code)) {
        return null;
      }
      seenCodes.add(code);

      return {
        code,
        name,
        apiKeyEnvName,
        concurrencyLimit: normalizePositiveInteger(
          record.concurrencyLimit,
          fallbackChannel.concurrencyLimit,
          1000,
        ),
        priority: normalizePositiveInteger(record.priority, index + 1, 999),
        enabled: record.enabled !== false,
      } satisfies RunningHubChannelConfig;
    })
    .filter((item): item is RunningHubChannelConfig => Boolean(item))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.name.localeCompare(right.name, "zh-CN");
    });

  return channels.length > 0 ? channels : [fallbackChannel];
}

export function normalizeRunningHubAllowedChannelCodes(input: unknown): string[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const codes = Array.from(new Set(input.map((item) => normalizeText(item)).filter(Boolean)));
  return codes.length > 0 ? codes : null;
}

export function getRunningHubChannelByCode(
  channels: RunningHubChannelConfig[],
  code: string | null | undefined,
) {
  if (!code) {
    return null;
  }

  return channels.find((channel) => channel.code === code) ?? null;
}

export function resolveRunningHubApiKey(envKey: string) {
  return process.env[envKey]?.trim() ?? "";
}

export function getRunningHubChannelSecretKeys(channels: RunningHubChannelConfig[]) {
  return Array.from(new Set(channels.map((channel) => channel.apiKeyEnvName)));
}
