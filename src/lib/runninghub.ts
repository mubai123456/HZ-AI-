import { getResolvedIntegrationSettings } from "@/lib/settings";

export interface RunningHubAuthConfig {
  baseUrl: string;
  apiKey: string;
}

export interface RunningHubSubmitResponse {
  taskId: string;
  status: "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";
  errorCode: string;
  errorMessage: string;
  results: unknown[] | null;
  clientId: string;
  promptTips: string;
}

export interface RunningHubQueryResponse {
  taskId: string;
  status: "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";
  errorCode: string;
  errorMessage: string;
  failedReason: unknown;
  usage: {
    consumeMoney: string | null;
    consumeCoins: string | null;
    taskCostTime: string;
    thirdPartyConsumeMoney: string | null;
  };
  results: Array<{
    url: string;
    outputType: string;
    text: string | null;
  }>;
  clientId: string;
  promptTips: string;
}

function readExceptionMessage(failedReason: unknown): string | null {
  if (!failedReason || typeof failedReason !== "object") {
    return null;
  }

  const candidate = (failedReason as Record<string, unknown>).exception_message;
  if (typeof candidate !== "string") {
    return null;
  }

  const normalized = candidate.trim();
  return normalized.length > 0 ? normalized : null;
}

export function getRunningHubTaskErrorMessage(input: {
  errorMessage?: string | null;
  failedReason?: unknown;
}) {
  return readExceptionMessage(input.failedReason) ?? input.errorMessage?.trim() ?? "";
}

export interface RunningHubUploadResponse {
  code: number;
  message: string;
  data: {
    type: string;
    download_url: string;
    fileName: string;
    size: string;
  };
}

export interface NodeInfo {
  nodeId: string;
  fieldName: string;
  fieldValue: string;
  fieldData?: string;
  description?: string;
}

export interface RunningHubSubmitRequestBody {
  nodeInfoList: NodeInfo[];
  instanceType: string;
  usePersonalQueue: string;
  webhookUrl?: string;
  [key: string]: unknown;
}

async function resolveAuthConfig(auth?: RunningHubAuthConfig): Promise<RunningHubAuthConfig> {
  if (auth) {
    return auth;
  }

  const integrationSettings = await getResolvedIntegrationSettings();
  const defaultChannel = integrationSettings.runninghubChannels[0];
  if (!defaultChannel) {
    throw new Error("No RunningHub channel configured");
  }

  const apiKey = process.env[defaultChannel.apiKeyEnvName]?.trim() ?? "";
  if (!apiKey) {
    throw new Error(`Missing RunningHub API key: ${defaultChannel.apiKeyEnvName}`);
  }

  return {
    baseUrl: integrationSettings.runninghubBaseUrl,
    apiKey,
  };
}

async function rhFetch<T>(
  path: string,
  options: RequestInit = {},
  auth?: RunningHubAuthConfig,
): Promise<T> {
  const resolvedAuth = await resolveAuthConfig(auth);
  const url = path.startsWith("http") ? path : `${resolvedAuth.baseUrl}/openapi/v2${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolvedAuth.apiKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`RunningHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function extractFileNameFromUrl(downloadUrl: string): string {
  try {
    const url = new URL(downloadUrl);
    const pathParts = url.pathname.split("/");
    const filename = pathParts[pathParts.length - 1] || "";
    if (!filename || filename === downloadUrl) {
      throw new Error("No path segments");
    }
    return filename;
  } catch {
    const lastSlash = downloadUrl.lastIndexOf("/");
    const queryStart = downloadUrl.indexOf("?");
    const end = queryStart > -1 ? queryStart : downloadUrl.length;
    const filename = downloadUrl.substring(lastSlash + 1, end);
    return filename || downloadUrl;
  }
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  auth?: RunningHubAuthConfig,
): Promise<{ downloadUrl: string; fileName: string }> {
  const resolvedAuth = await resolveAuthConfig(auth);
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
  formData.append("file", blob, fileName);

  const response = await fetch(`${resolvedAuth.baseUrl}/openapi/v2/media/upload/binary`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolvedAuth.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const data: RunningHubUploadResponse = await response.json();
  if (data.code !== 0) {
    throw new Error(`Upload failed: ${data.message}`);
  }

  return {
    downloadUrl: data.data.download_url,
    fileName: extractFileNameFromUrl(data.data.download_url),
  };
}

export function buildRunningHubSubmitRequest(
  nodeInfoList: NodeInfo[],
  webhookUrl?: string,
  submitOptions?: Record<string, string>,
): RunningHubSubmitRequestBody {
  const body: RunningHubSubmitRequestBody = {
    nodeInfoList,
    instanceType: submitOptions?.instanceType ?? "default",
    usePersonalQueue: submitOptions?.usePersonalQueue ?? "false",
  };

  if (webhookUrl) {
    body.webhookUrl = webhookUrl;
  }

  if (submitOptions) {
    for (const [key, value] of Object.entries(submitOptions)) {
      if (key === "instanceType" || key === "usePersonalQueue") {
        continue;
      }
      body[key] = value;
    }
  }

  return body;
}

export async function submitTask(
  webappId: string,
  nodeInfoList: NodeInfo[],
  webhookUrl?: string,
  submitOptions?: Record<string, string>,
  auth?: RunningHubAuthConfig,
): Promise<RunningHubSubmitResponse> {
  const body = buildRunningHubSubmitRequest(nodeInfoList, webhookUrl, submitOptions);

  return rhFetch<RunningHubSubmitResponse>(
    `/run/ai-app/${webappId}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    auth,
  );
}

export async function queryTask(
  taskId: string,
  auth?: RunningHubAuthConfig,
): Promise<RunningHubQueryResponse> {
  return rhFetch<RunningHubQueryResponse>(
    "/query",
    {
      method: "POST",
      body: JSON.stringify({ taskId }),
    },
    auth,
  );
}

export async function cancelTask(
  taskId: string,
  auth?: RunningHubAuthConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    await rhFetch<{ code: number; message: string }>(
      "/cancel",
      {
        method: "POST",
        body: JSON.stringify({ taskId }),
      },
      auth,
    );
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "取消失败";
    console.warn(`[runninghub] cancelTask ${taskId} failed: ${message}`);
    return { success: false, error: message };
  }
}

export function buildNodeInfoList(
  formData: Record<string, string | string[]>,
  requestMapping: Record<string, string>,
  formSchema: Array<{
    key: string;
    type: string;
    description?: string;
    label: string;
    options?: Array<{ label: string; value: string }>;
  }>,
  defaultParams?: Record<string, string>,
): NodeInfo[] {
  const result: NodeInfo[] = [];
  const grouped: Record<string, { nodeId: string; fieldName: string; values: string[] }> = {};

  for (const [localKey, rhPath] of Object.entries(requestMapping)) {
    const raw = formData[localKey];
    const value = raw === undefined ? "" : raw;

    const dotIdx = rhPath.indexOf(".");
    const nodeId = rhPath.substring(0, dotIdx);
    const fieldName = rhPath.substring(dotIdx + 1);
    const fieldValue = Array.isArray(value) ? value.join(",") : String(value);

    const hasArrayIndex = /\[\d+\]$/.test(fieldName);
    if (hasArrayIndex) {
      result.push({ nodeId, fieldName, fieldValue });
      continue;
    }

    const key = `${nodeId}|${fieldName}`;
    if (!grouped[key]) {
      grouped[key] = { nodeId, fieldName, values: [] };
    }
    grouped[key].values.push(fieldValue);
  }

  const groupedNodeInfos = Object.values(grouped).map(({ nodeId, fieldName, values }) => {
    const field = formSchema.find((item) => {
      const rhPath = requestMapping[item.key];
      if (!rhPath) {
        return false;
      }

      const dotIdx = rhPath.indexOf(".");
      const schemaNodeId = rhPath.substring(0, dotIdx);
      const schemaFieldName = rhPath.substring(dotIdx + 1).replace(/\[\d+\]$/, "");
      return schemaNodeId === nodeId && schemaFieldName === fieldName;
    });

    let description: string | undefined;
    let fieldData: string | undefined;

    if (field?.type === "image") {
      description = field.description || "上传图像";
    } else if (field?.type === "textarea" && fieldName === "text") {
      description = "输入文本";
    } else if (field?.type === "select" && field.options && field.options.length > 0) {
      description = field.description || "选择参数";
      const allValues = field.options.map((option) => option.value);
      const defaultValue = defaultParams?.[field.key] ?? allValues[0];

      if (field.key === "aspectRatio") {
        fieldData = JSON.stringify([allValues, { default: defaultValue }]);
      } else {
        fieldData = JSON.stringify(
          field.options.map((option, index) => ({
            name: option.value,
            index: option.value,
            description: option.label ?? option.value,
            fastIndex: index + 1,
          })),
        );
      }
    }

    return {
      nodeId,
      fieldName,
      fieldValue: values.join(","),
      ...(description ? { description } : {}),
      ...(fieldData ? { fieldData } : {}),
    };
  });

  return result.concat(groupedNodeInfos);
}
