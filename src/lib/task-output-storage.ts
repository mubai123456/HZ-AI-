export const TASK_OUTPUT_STORAGE_MODES = ["provider_url", "object_storage"] as const;

export type TaskOutputStorageMode = (typeof TASK_OUTPUT_STORAGE_MODES)[number];

export function normalizeTaskOutputStorageMode(
  value: string | null | undefined,
): TaskOutputStorageMode {
  return String(value ?? "").trim().toLowerCase() === "object_storage"
    ? "object_storage"
    : "provider_url";
}

export function shouldPersistTaskOutputAssets(
  value: string | null | undefined,
): boolean {
  return normalizeTaskOutputStorageMode(value) === "object_storage";
}
