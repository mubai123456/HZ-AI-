import type { AppInputField, TaskAssetRecord, TaskInputSchemaField } from "@/lib/types";

function normalizeHidden(hidden: boolean | undefined) {
  return hidden ?? false;
}

export function buildTaskInputSchema(fields: AppInputField[] | null | undefined): TaskInputSchemaField[] {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    hidden: normalizeHidden(field.hidden),
  }));
}

function buildImageFieldOrderMap(schema: TaskInputSchemaField[] | undefined) {
  const imageFieldEntries =
    schema
      ?.filter((field) => field.type === "image")
      .map((field, index) => [field.key, index] as const) ?? [];

  return new Map(imageFieldEntries);
}

export function sortTaskInputAssets(
  assets: TaskAssetRecord[],
  schema?: TaskInputSchemaField[],
): TaskAssetRecord[] {
  const imageFieldOrder = buildImageFieldOrderMap(schema);

  return [...assets].sort((left, right) => {
    const leftRank = imageFieldOrder.get(left.sourceSlot ?? "") ?? Number.MAX_SAFE_INTEGER;
    const rightRank = imageFieldOrder.get(right.sourceSlot ?? "") ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return 0;
  });
}

export function getPrimaryTaskInputAsset(
  assets: TaskAssetRecord[],
  schema?: TaskInputSchemaField[],
): TaskAssetRecord | null {
  return sortTaskInputAssets(assets, schema)[0] ?? null;
}

export function getTaskInputFieldLabel(
  fieldKey: string,
  schema?: TaskInputSchemaField[],
  fallback?: string,
): string {
  return schema?.find((field) => field.key === fieldKey)?.label ?? fallback ?? fieldKey;
}
