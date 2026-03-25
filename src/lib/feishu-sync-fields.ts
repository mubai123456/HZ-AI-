import type { AppInputField } from "@/lib/types";

export const FEISHU_SHARED_SYNC_FIELDS = [
  "taskNo",
  "status",
  "providerStatus",
  "providerResultUrl",
  "providerErrorMessage",
  "ownerName",
  "appName",
  "prompt",
  "promptTemplateName",
  "promptTemplateContent",
  "allInfo",
  "createdAt",
] as const;

export type FeishuSharedSyncField = (typeof FEISHU_SHARED_SYNC_FIELDS)[number];
export type FeishuParamSyncField = `params.${string}`;
export type FeishuSyncSourceKey = FeishuSharedSyncField | FeishuParamSyncField;

export type FeishuSyncFieldOption = {
  value: FeishuSyncSourceKey;
  label: string;
  group: "shared" | "params";
};

const SHARED_FIELD_LABELS: Record<FeishuSharedSyncField, string> = {
  taskNo: "任务 ID (taskNo)",
  status: "任务状态 (status)",
  providerStatus: "三方状态 (providerStatus)",
  providerResultUrl: "结果链接 (providerResultUrl)",
  providerErrorMessage: "错误信息 (providerErrorMessage)",
  ownerName: "提交人 (ownerName)",
  appName: "应用名称 (appName)",
  prompt: "提示词 (prompt)",
  promptTemplateName: "提示词模板 (promptTemplateName)",
  promptTemplateContent: "模板提示词 (promptTemplateContent)",
  allInfo: "全部信息 (allInfo)",
  createdAt: "创建时间 (createdAt)",
};

const FEISHU_SHARED_SYNC_FIELD_SET = new Set<string>(FEISHU_SHARED_SYNC_FIELDS);

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeParamFieldKey(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

export function isSharedFeishuSyncField(value: string): value is FeishuSharedSyncField {
  return FEISHU_SHARED_SYNC_FIELD_SET.has(value);
}

export function isParamFeishuSyncField(value: string): value is FeishuParamSyncField {
  if (!value.startsWith("params.")) {
    return false;
  }

  return normalizeParamFieldKey(value.slice("params.".length)) !== null;
}

export function isFeishuSyncSourceKey(
  value: string,
  allowedSourceKeys?: Iterable<string>,
): value is FeishuSyncSourceKey {
  if (allowedSourceKeys) {
    const allowedSet =
      allowedSourceKeys instanceof Set ? allowedSourceKeys : new Set(allowedSourceKeys);
    return allowedSet.has(value);
  }

  return isSharedFeishuSyncField(value) || isParamFeishuSyncField(value);
}

export function createParamFeishuSyncField(fieldKey: string): FeishuParamSyncField | null {
  const normalized = normalizeParamFieldKey(fieldKey);
  if (!normalized) {
    return null;
  }

  return `params.${normalized}`;
}

export function getSharedFeishuSyncFieldOptions(): FeishuSyncFieldOption[] {
  return FEISHU_SHARED_SYNC_FIELDS.map((field) => ({
    value: field,
    label: SHARED_FIELD_LABELS[field],
    group: "shared",
  }));
}

export function getSharedFeishuSyncSourceKeys(): Set<FeishuSyncSourceKey> {
  return new Set(getSharedFeishuSyncFieldOptions().map((option) => option.value));
}

export function getSharedFeishuSyncFieldSortIndex(field: FeishuSharedSyncField): number {
  return FEISHU_SHARED_SYNC_FIELDS.indexOf(field);
}

export function getAppFeishuSyncFieldOptions(
  formFields: Array<Pick<AppInputField, "key" | "label" | "type">>,
): FeishuSyncFieldOption[] {
  const paramOptions = formFields
    .flatMap((field) => {
      const paramField = createParamFeishuSyncField(field.key);
      if (!paramField) {
        return [];
      }

      const label = normalizeText(field.label) || field.key;
      return [
        {
          value: paramField,
          label: `${label} (${paramField})`,
          group: "params" as const,
        },
      ];
    })
    .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));

  const dedupedParamOptions = Array.from(
    new Map(paramOptions.map((option) => [option.value, option])).values(),
  );

  return [...getSharedFeishuSyncFieldOptions(), ...dedupedParamOptions];
}

export function getAppFeishuSyncSourceKeys(
  formFields: Array<Pick<AppInputField, "key" | "label" | "type">>,
): Set<FeishuSyncSourceKey> {
  return new Set(getAppFeishuSyncFieldOptions(formFields).map((option) => option.value));
}
