import { extractProviderSubmitOptions } from "@/lib/app-submit";
import { env } from "@/lib/env";
import {
  FEISHU_SHARED_SYNC_FIELDS,
  type FeishuSyncSourceKey,
} from "@/lib/feishu-sync-fields";
import {
  normalizeFeishuColumnMappings,
  type FeishuColumnMappingRecord,
} from "@/lib/feishu-sync-mapping";
import { prisma } from "@/lib/prisma";
import { buildRunningHubSubmitRequest, buildNodeInfoList, type NodeInfo } from "@/lib/runninghub";

export const FEISHU_SYNC_FIELDS = FEISHU_SHARED_SYNC_FIELDS;

export type FeishuSyncField = FeishuSyncSourceKey;
export type { FeishuColumnMappingEntry, FeishuColumnMappingRecord } from "@/lib/feishu-sync-mapping";
export { mappingRecordToEntries, normalizeFeishuColumnMappings } from "@/lib/feishu-sync-mapping";

export type ResolvedFeishuSyncConfig = {
  target: {
    appToken: string;
    tableId: string;
  };
  globalMapping: FeishuColumnMappingRecord;
  appMapping: FeishuColumnMappingRecord;
  mapping: FeishuColumnMappingRecord;
  enabled: boolean;
};

type ResolveFeishuSyncConfigInput = {
  globalSettings?: {
    feishuAppToken?: string | null;
    feishuTableId?: string | null;
    columnMappings?: unknown;
  } | null;
  appSyncMappingJson?: unknown;
  envTarget?: {
    appToken?: string | null;
    tableId?: string | null;
  };
  envSecret?: string | null;
};

type BuildTaskSyncPayloadInput = {
  taskNo: string;
  status: string;
  providerStatus?: string | null;
  providerResultUrl?: string | null;
  providerErrorMessage?: string | null;
  providerTaskId?: string | null;
  ownerName?: string | null;
  appCode?: string | null;
  appName?: string | null;
  providerAppId?: string | null;
  prompt?: string | null;
  createdAt: Date;
  paramsJson?: unknown;
  requestMappingJson?: unknown;
  defaultParamsJson?: unknown;
  formSchemaJson?: unknown;
  resultJson?: unknown;
  webhookUrl?: string | null;
};

type FeishuSubmitPreview = {
  requestBody: ReturnType<typeof buildRunningHubSubmitRequest>;
  source: "stored" | "reconstructed";
};

type PromptTemplateSnapshot = {
  id: string | null;
  name: string | null;
  templatePrompt: string | null;
};

type AppFormField = {
  key: string;
  label: string;
  type: string;
  description?: string;
  options?: Array<{ label: string; value: string }>;
};

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function serializeSimpleParamValue(value: unknown): string | null {
  if (typeof value === "string") {
    return normalizeText(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return null;
    }

    return JSON.stringify(value);
  }

  return null;
}

function serializeParamFieldValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => serializeSimpleParamValue(item))
      .filter((item): item is string => Boolean(item));

    return items.length > 0 ? items.join("\n") : null;
  }

  return serializeSimpleParamValue(value);
}

function isPlaceholderValue(value: string | null): boolean {
  if (!value) {
    return true;
  }

  return value.startsWith("replace_with_");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRecordOfStrings(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, rawValue]) => {
      if (typeof rawValue === "string") {
        return [[key, rawValue]];
      }

      return [];
    }),
  );
}

function normalizeFormSchema(value: unknown): AppFormField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isPlainObject(item)) {
      return [];
    }

    const key = normalizeText(item.key);
    const label = normalizeText(item.label);
    const type = normalizeText(item.type);

    if (!key || !label || !type) {
      return [];
    }

    const options = Array.isArray(item.options)
      ? item.options.flatMap((option) => {
          if (!isPlainObject(option)) {
            return [];
          }

          const optionLabel = normalizeText(option.label);
          const optionValue = normalizeText(option.value);
          if (!optionLabel || !optionValue) {
            return [];
          }

          return [{ label: optionLabel, value: optionValue }];
        })
      : undefined;

    return [
      {
        key,
        label,
        type,
        description: normalizeText(item.description) ?? undefined,
        options,
      },
    ];
  });
}

function extractStoredSubmitPreview(resultJson: unknown): FeishuSubmitPreview | null {
  if (!isPlainObject(resultJson)) {
    return null;
  }

  const stored = resultJson.submitRequest;
  if (!isPlainObject(stored)) {
    return null;
  }

  const nodeInfoList = Array.isArray(stored.nodeInfoList)
    ? stored.nodeInfoList.filter(isPlainObject).map((node) => ({
        nodeId: String(node.nodeId ?? ""),
        fieldName: String(node.fieldName ?? ""),
        fieldValue: String(node.fieldValue ?? ""),
        ...(normalizeText(node.fieldData) ? { fieldData: String(node.fieldData) } : {}),
        ...(normalizeText(node.description) ? { description: String(node.description) } : {}),
      }))
    : [];

  if (nodeInfoList.length === 0) {
    return null;
  }

  return {
    source: "stored",
    requestBody: {
      ...stored,
      nodeInfoList,
      instanceType: normalizeText(stored.instanceType) ?? "default",
      usePersonalQueue: normalizeText(stored.usePersonalQueue) ?? "false",
    } as ReturnType<typeof buildRunningHubSubmitRequest>,
  };
}

function extractPromptTemplateSnapshot(resultJson: unknown): PromptTemplateSnapshot | null {
  if (!isPlainObject(resultJson) || !isPlainObject(resultJson.promptTemplate)) {
    return null;
  }

  const snapshot = resultJson.promptTemplate;
  const id = normalizeText(snapshot.id);
  const name = normalizeText(snapshot.name);
  const templatePrompt = normalizeText(snapshot.templatePrompt);

  if (!id && !name && !templatePrompt) {
    return null;
  }

  return {
    id: id ?? null,
    name: name ?? null,
    templatePrompt: templatePrompt ?? null,
  };
}

function buildSubmitPreview(input: BuildTaskSyncPayloadInput): FeishuSubmitPreview | null {
  const storedPreview = extractStoredSubmitPreview(input.resultJson);
  if (storedPreview) {
    return storedPreview;
  }

  const requestMapping = normalizeRecordOfStrings(input.requestMappingJson);
  const defaultParams = normalizeRecordOfStrings(input.defaultParamsJson);
  const formSchema = normalizeFormSchema(input.formSchemaJson);
  const params = normalizeRecordOfStrings(input.paramsJson);

  if (!input.providerAppId || Object.keys(requestMapping).length === 0 || formSchema.length === 0) {
    return null;
  }

  const providerFormData: Record<string, string | string[]> = { ...params };
  const promptField = formSchema.find((field) => field.type === "textarea");
  const effectivePrompt = normalizeText(input.prompt) ?? normalizeText(params.prompt);
  if (promptField && effectivePrompt) {
    providerFormData[promptField.key] = effectivePrompt;
  }

  const nodeInfoList = buildNodeInfoList(
    providerFormData,
    requestMapping,
    formSchema,
    defaultParams,
  );

  if (nodeInfoList.length === 0) {
    return null;
  }

  return {
    source: "reconstructed",
    requestBody: buildRunningHubSubmitRequest(
      nodeInfoList as NodeInfo[],
      input.webhookUrl ?? undefined,
      extractProviderSubmitOptions(defaultParams, formSchema.map((field) => field.key)),
    ),
  };
}

function buildAllInfoText(
  input: BuildTaskSyncPayloadInput,
  effectivePrompt: string | null,
): string {
  const params = isPlainObject(input.paramsJson) ? input.paramsJson : {};
  const submitPreview = buildSubmitPreview(input);
  const promptTemplate = extractPromptTemplateSnapshot(input.resultJson);

  return JSON.stringify(
    {
      taskNo: input.taskNo,
      app: {
        code: normalizeText(input.appCode) ?? null,
        name: normalizeText(input.appName) ?? null,
        providerAppId: normalizeText(input.providerAppId) ?? null,
      },
      ownerName: normalizeText(input.ownerName) ?? null,
      status: {
        taskStatus: input.status,
        providerStatus: normalizeText(input.providerStatus) ?? null,
        providerTaskId: normalizeText(input.providerTaskId) ?? null,
      },
      prompt: effectivePrompt,
      promptTemplate,
      formData: params,
      apiRequest: submitPreview
        ? {
            endpoint: `/openapi/v2/run/ai-app/${input.providerAppId}`,
            source: submitPreview.source,
            body: submitPreview.requestBody,
          }
        : null,
      result: {
        providerResultUrl: normalizeText(input.providerResultUrl) ?? null,
        providerErrorMessage: normalizeText(input.providerErrorMessage) ?? null,
      },
      createdAt: input.createdAt.toISOString(),
    },
    null,
    2,
  );
}

export function resolveFeishuSyncConfig(
  input: ResolveFeishuSyncConfigInput,
): ResolvedFeishuSyncConfig {
  const envTarget = {
    appToken: normalizeText(input.envTarget?.appToken ?? env.FEISHU_APP_TOKEN) ?? "",
    tableId: normalizeText(input.envTarget?.tableId ?? env.FEISHU_TABLE_ID) ?? "",
  };
  const envSecret = normalizeText(input.envSecret ?? env.FEISHU_APP_SECRET);
  const globalMapping = normalizeFeishuColumnMappings(input.globalSettings?.columnMappings);
  const appMapping = normalizeFeishuColumnMappings(input.appSyncMappingJson);

  const rawAppToken = normalizeText(input.globalSettings?.feishuAppToken);
  const rawTableId = normalizeText(input.globalSettings?.feishuTableId);
  const appToken =
    rawAppToken && rawAppToken !== envSecret && !isPlaceholderValue(rawAppToken)
      ? rawAppToken
      : envTarget.appToken;
  const tableId = rawTableId && !isPlaceholderValue(rawTableId) ? rawTableId : envTarget.tableId;
  const mapping = {
    ...globalMapping,
    ...appMapping,
  };

  return {
    target: {
      appToken,
      tableId,
    },
    globalMapping,
    appMapping,
    mapping,
    enabled: Boolean(appToken && tableId && Object.keys(mapping).length > 0),
  };
}

export async function getResolvedFeishuSyncConfig(
  appSyncMappingJson: unknown,
): Promise<ResolvedFeishuSyncConfig> {
  const settings = await prisma.feishuSettings.findUnique({
    where: { id: "default" },
  });

  return resolveFeishuSyncConfig({
    globalSettings: settings,
    appSyncMappingJson,
  });
}

export function buildTaskSyncPayload(
  input: BuildTaskSyncPayloadInput,
): Record<string, string> {
  const params =
    input.paramsJson && typeof input.paramsJson === "object" && !Array.isArray(input.paramsJson)
      ? (input.paramsJson as Record<string, unknown>)
      : {};
  const promptTemplate = extractPromptTemplateSnapshot(input.resultJson);
  const promptFromParams = normalizeText(params.prompt);
  const effectivePrompt = normalizeText(input.prompt) ?? promptFromParams;

  const payload: Record<string, string> = {
    taskNo: input.taskNo,
    status: input.status,
    ...(normalizeText(input.providerStatus) ? { providerStatus: input.providerStatus!.trim() } : {}),
    ...(normalizeText(input.providerResultUrl)
      ? { providerResultUrl: input.providerResultUrl!.trim() }
      : {}),
    ...(normalizeText(input.providerErrorMessage)
      ? { providerErrorMessage: input.providerErrorMessage!.trim() }
      : {}),
    ...(normalizeText(input.providerTaskId) ? { providerTaskId: input.providerTaskId!.trim() } : {}),
    ...(normalizeText(input.ownerName) ? { ownerName: input.ownerName!.trim() } : {}),
    ...(normalizeText(input.appName) ? { appName: input.appName!.trim() } : {}),
    ...(effectivePrompt ? { prompt: effectivePrompt } : {}),
    ...(promptTemplate?.name ? { promptTemplateName: promptTemplate.name } : {}),
    ...(promptTemplate?.templatePrompt
      ? { promptTemplateContent: promptTemplate.templatePrompt }
      : {}),
    allInfo: buildAllInfoText(input, effectivePrompt),
    createdAt: input.createdAt.toISOString(),
  };

  for (const [paramKey, value] of Object.entries(params)) {
    const serializedValue = serializeParamFieldValue(value);
    if (!serializedValue) {
      continue;
    }

    payload[`params.${paramKey}`] = serializedValue;
  }

  return payload;
}
