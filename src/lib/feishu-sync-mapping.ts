import {
  getSharedFeishuSyncFieldSortIndex,
  type FeishuSyncSourceKey,
  isFeishuSyncSourceKey,
  isSharedFeishuSyncField,
} from "@/lib/feishu-sync-fields";

export type FeishuColumnMappingRecord = Partial<Record<FeishuSyncSourceKey, string>>;

export type FeishuColumnMappingEntry = {
  taskField: FeishuSyncSourceKey;
  feishuColumn: string;
};

type NormalizeFeishuColumnMappingsOptions = {
  allowedSourceKeys?: Iterable<string>;
};

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeFeishuColumnMappings(
  input: unknown,
  options: NormalizeFeishuColumnMappingsOptions = {},
): FeishuColumnMappingRecord {
  const mapping: FeishuColumnMappingRecord = {};
  const allowedSourceKeys = options.allowedSourceKeys;

  if (Array.isArray(input)) {
    for (const item of input) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const taskField = normalizeText((item as FeishuColumnMappingEntry).taskField);
      const feishuColumn = normalizeText((item as FeishuColumnMappingEntry).feishuColumn);

      if (
        !taskField ||
        !feishuColumn ||
        !isFeishuSyncSourceKey(taskField, allowedSourceKeys)
      ) {
        continue;
      }

      mapping[taskField] = feishuColumn;
    }

    return mapping;
  }

  if (!input || typeof input !== "object") {
    return mapping;
  }

  for (const [taskField, feishuColumn] of Object.entries(input)) {
    const normalizedField = normalizeText(taskField);
    const normalizedColumn = normalizeText(feishuColumn);

    if (
      !normalizedField ||
      !normalizedColumn ||
      !isFeishuSyncSourceKey(normalizedField, allowedSourceKeys)
    ) {
      continue;
    }

    mapping[normalizedField] = normalizedColumn;
  }

  return mapping;
}

export function mappingRecordToEntries(
  mapping: FeishuColumnMappingRecord,
): FeishuColumnMappingEntry[] {
  return Object.entries(mapping)
    .flatMap(([taskField, feishuColumn]) => {
      const normalizedField = normalizeText(taskField);
      const normalizedColumn = normalizeText(feishuColumn);
      if (!normalizedField || !normalizedColumn || !isFeishuSyncSourceKey(normalizedField)) {
        return [];
      }

      return [
        {
          taskField: normalizedField,
          feishuColumn: normalizedColumn,
        },
      ];
    })
    .sort((left, right) => {
      if (isSharedFeishuSyncField(left.taskField) && isSharedFeishuSyncField(right.taskField)) {
        return (
          getSharedFeishuSyncFieldSortIndex(left.taskField) -
          getSharedFeishuSyncFieldSortIndex(right.taskField)
        );
      }

      if (isSharedFeishuSyncField(left.taskField)) {
        return -1;
      }

      if (isSharedFeishuSyncField(right.taskField)) {
        return 1;
      }

      return left.taskField.localeCompare(right.taskField, "zh-CN");
    });
}
