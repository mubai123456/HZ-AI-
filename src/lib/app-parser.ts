import type { AppInputField, InputFieldType } from "@/lib/types";

export interface ParsedField {
  key: string;
  label: string;
  type: "image" | "textarea" | "select";
  required: boolean;
  description: string;
  mapping: string;
  defaultValue: string;
  options: Array<{ label: string; value: string }>;
}

interface NodeInfo {
  nodeId: string;
  fieldName: string;
  fieldValue?: string;
  description?: string;
  fieldData?: unknown;
}

interface ApiExample {
  nodeInfoList?: NodeInfo[];
  instanceType?: string;
  usePersonalQueue?: string;
  [key: string]: unknown;
}

export interface ParsedNode {
  key: string;
  label: string;
  type: InputFieldType;
  nodeId: string;
  fieldName: string;
  defaultValue: string;
  description: string;
  required: boolean;
  options: Array<{ label: string; value: string }>;
  hidden?: boolean;
}

const LABEL_MAP: Record<string, string> = {
  image: "图片",
  images: "图片",
  img: "图片",
  photo: "照片",
  prompt: "提示词",
  text: "文本",
  content: "内容",
  style: "风格",
  model: "模型",
  ratio: "比例",
  size: "尺寸",
  count: "数量",
  seed: "种子",
  strength: "强度",
  guidance: "引导强度",
  aspectratio: "比例",
  aspect_ratio: "比例",
  resolution: "分辨率",
  channel: "通道",
};

const SELECT_FIELD_NAMES = new Set([
  "style", "model", "ratio", "size", "instancetype",
  "sampler", "upscale", "facetool", "upscale_model",
  "aspectratio", "aspect_ratio", "resolution", "channel",
]);

function normalizeFieldName(fieldName: string) {
  return fieldName.toLowerCase().replace(/\[\d+\]$/, "");
}

function inferType(
  fieldName: string,
  hasSelectMetadata = false,
): "image" | "textarea" | "select" {
  const lower = normalizeFieldName(fieldName);
  if (lower.includes("image") || lower.includes("img") || lower.includes("photo")) {
    return "image";
  }
  if (hasSelectMetadata || SELECT_FIELD_NAMES.has(lower)) {
    return "select";
  }
  if (lower.includes("prompt")) {
    return "textarea";
  }
  if (lower.includes("text") || lower.includes("content") || lower.includes("description")) {
    return "textarea";
  }
  return "textarea";
}

function toLabel(fieldName: string): string {
  // 去掉序号后缀，如 "image_1" / "images[0]" -> "image"
  const baseName = fieldName.replace(/\[\d+\]$/, "").replace(/_(\d+)$/, "");
  return LABEL_MAP[baseName.toLowerCase()] ?? baseName;
}

function parseSelectOptions(fieldValue: unknown): Array<{ label: string; value: string }> {
  if (typeof fieldValue === "string" && fieldValue.includes(",")) {
    return fieldValue.split(",").map((v) => {
      const trimmed = v.trim();
      return { label: trimmed, value: trimmed };
    });
  }
  if (Array.isArray(fieldValue)) {
    return fieldValue.map((v) => {
      const trimmed = String(v).trim();
      return { label: trimmed, value: trimmed };
    });
  }
  return [];
}

function normalizeText(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function parseFieldData(fieldData: unknown) {
  if (typeof fieldData === "string") {
    const trimmed = fieldData.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (Array.isArray(fieldData) || (fieldData && typeof fieldData === "object")) {
    return fieldData;
  }

  return null;
}

function toSelectOption(value: unknown): { label: string; value: string } | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = normalizeText(value);
    return text ? { label: text, value: text } : null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const label = normalizeText(
    record.description ?? record.label ?? record.name ?? record.index ?? record.value,
  );
  const optionValue = normalizeText(
    record.index ?? record.value ?? record.name ?? record.label ?? record.description,
  );

  if (!label && !optionValue) {
    return null;
  }

  return {
    label: label || optionValue,
    value: optionValue || label,
  };
}

function parseSelectConfig(node: NodeInfo): {
  options: Array<{ label: string; value: string }>;
  defaultValue: string;
} | null {
  const parsedFieldData = parseFieldData(node.fieldData);

  if (Array.isArray(parsedFieldData)) {
    if (Array.isArray(parsedFieldData[0])) {
      const options = parsedFieldData[0]
        .map((item) => toSelectOption(item))
        .filter((item): item is { label: string; value: string } => item !== null);
      const meta = parsedFieldData[1];
      const defaultValue =
        meta && typeof meta === "object" && !Array.isArray(meta)
          ? normalizeText((meta as Record<string, unknown>).default)
          : "";

      if (options.length > 0) {
        return { options, defaultValue };
      }
    }

    const options = parsedFieldData
      .map((item) => toSelectOption(item))
      .filter((item): item is { label: string; value: string } => item !== null);

    if (options.length > 0) {
      return { options, defaultValue: "" };
    }
  }

  return null;
}

function extractJson(input: string): string {
  // 去掉开头的 curl 命令，只保留 --data-raw 或 --data 之后的内容
  const afterData = input.replace(/^[\s\S]*?--(?:data-raw|data)\s*/, "");
  const trimmed = afterData.trim();

  // 尝试直接解析
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // 忽略
  }

  // 如果以 { 开头，找最后一个 } 作为结束（处理嵌套 JSON）
  if (trimmed.startsWith("{")) {
    const lastBrace = trimmed.lastIndexOf("}");
    if (lastBrace > 0) {
      const candidate = trimmed.substring(0, lastBrace + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        // 忽略
      }
    }
  }

  // 如果以 ' 开头，提取引号内容（支持跨行）
  if (trimmed.startsWith("'")) {
    const jsonMatch = trimmed.match(/^'([\s\S]*?)'$/);
    if (jsonMatch) {
      return jsonMatch[1];
    }
  }

  // 如果以 " 开头，提取引号内容
  if (trimmed.startsWith('"')) {
    const jsonMatch = trimmed.match(/^"([\s\S]*?)"$/);
    if (jsonMatch) {
      return jsonMatch[1];
    }
  }

  throw new Error("无法从输入中提取 JSON，请确保粘贴的是纯 JSON 或包含 --data-raw 的 curl 命令");
}

export interface ParseResult {
  providerAppId: string;
  fields: ParsedField[];
  nodes: ParsedNode[];
  extraParams: Record<string, string>;
}

export function parseApiExample(input: string): ParseResult {
  const json = extractJson(input);
  const parsed: ApiExample = JSON.parse(json);
  const nodeInfoList = parsed.nodeInfoList ?? [];
  const providerAppId = extractProviderAppId(input);

  // 额外的顶级参数（instanceType, usePersonalQueue 等）
  const extraParams: Record<string, string> = {};
  for (const key of Object.keys(parsed)) {
    if (key !== "nodeInfoList") {
      const val = parsed[key];
      if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
        extraParams[key] = String(val);
      }
    }
  }

  // 统计每个 fieldName 出现的次数，用于生成唯一 key
  const fieldNameCount: Record<string, number> = {};
  for (const node of nodeInfoList) {
    fieldNameCount[node.fieldName] = (fieldNameCount[node.fieldName] ?? 0) + 1;
  }

  // 为每个 fieldName 维护一个计数器，用于生成唯一序号
  const fieldNameCounter: Record<string, number> = {};

  const fields: ParsedField[] = nodeInfoList.map((node) => {
    const parsedSelectConfig = parseSelectConfig(node);
    const type = inferType(node.fieldName, parsedSelectConfig !== null);
    const options =
      type === "select"
        ? parsedSelectConfig?.options ?? parseSelectOptions(node.fieldValue)
        : [];

    // 生成唯一 key：如果同名出现多次，用 fieldName_1, fieldName_2 方式区分
    const count = fieldNameCount[node.fieldName] ?? 1;
    fieldNameCounter[node.fieldName] = (fieldNameCounter[node.fieldName] ?? 0) + 1;
    const isDuplicate = count > 1;
    const uniqueKey = isDuplicate
      ? `${node.fieldName}_${fieldNameCounter[node.fieldName]}`
      : node.fieldName;

    // 非 select 类型：fieldValue 如果是单值且不是文件名 hash，就当作默认值
    let defaultValue = "";
    if (type === "select") {
      const fallbackValue =
        typeof node.fieldValue === "string" && !node.fieldValue.includes(",")
          ? node.fieldValue
          : "";
      defaultValue =
        parsedSelectConfig?.defaultValue ||
        normalizeText(fallbackValue) ||
        options[0]?.value ||
        "";
    } else if (typeof node.fieldValue === "string" && node.fieldValue) {
      if (node.fieldValue.length < 100 && !/^[a-f0-9]{32,}$/i.test(node.fieldValue)) {
        defaultValue = node.fieldValue;
      }
    }

    return {
      key: uniqueKey,
      label: toLabel(node.fieldName),
      type,
      required: false,
      description: node.description ?? "",
      mapping: `${node.nodeId}.${node.fieldName}`,
      defaultValue,
      options,
    };
  });

  return {
    providerAppId,
    fields,
    nodes: fields.map((field) => {
      const [nodeId, fieldName] = splitMapping(field.mapping);
      return {
        key: field.key,
        label: field.label,
        type: field.type,
        nodeId,
        fieldName,
        defaultValue: field.defaultValue,
        description: field.description,
        required: field.required,
        options: field.options,
      };
    }),
    extraParams,
  };
}

export function buildNodesFromAppConfig(
  formSchemaJson: AppInputField[],
  requestMappingJson: Record<string, string>,
  defaultParamsJson: Record<string, string>,
): ParsedNode[] {
  return formSchemaJson.map((field) => {
    const mapping = requestMappingJson[field.key] ?? "";
    const [nodeId, fieldName] = splitMapping(mapping);
    return {
      key: field.key,
      label: field.label,
      type: field.type,
      nodeId,
      fieldName,
      defaultValue: defaultParamsJson[field.key] ?? "",
      description: field.description ?? "",
      required: field.required ?? false,
      options: field.options ?? [],
      hidden: field.hidden ?? false,
    };
  });
}

export function buildConfigFromNodes(
  nodes: ParsedNode[],
  extraParams: Record<string, string> = {},
): {
  formSchemaJson: AppInputField[];
  requestMappingJson: Record<string, string>;
  defaultParamsJson: Record<string, string>;
} {
  const cleanedNodes = nodes
    .map((node) => ({
      ...node,
      key: node.key.trim(),
      label: node.label.trim(),
      nodeId: node.nodeId.trim(),
      fieldName: node.fieldName.trim(),
      description: node.description ?? "",
      defaultValue: node.defaultValue ?? "",
      options: (node.options ?? []).filter((option) => option.label.trim() || option.value.trim()),
      hidden: node.hidden ?? false,
    }))
    .filter((node) => node.key && node.label && node.nodeId && node.fieldName);

  const formSchemaJson: AppInputField[] = cleanedNodes.map((node) => ({
    key: node.key,
    label: node.label,
    type: node.type,
    required: node.required,
    description: node.description,
    ...(node.hidden ? { hidden: true } : {}),
    ...(node.options.length > 0 ? { options: node.options } : {}),
  }));

  const requestMappingJson = Object.fromEntries(
    cleanedNodes.map((node) => [node.key, `${node.nodeId}.${node.fieldName}`]),
  );

  const defaultParamsJson = cleanedNodes.reduce<Record<string, string>>((acc, node) => {
    if (node.defaultValue) {
      acc[node.key] = node.defaultValue;
    }
    return acc;
  }, {});

  return {
    formSchemaJson,
    requestMappingJson,
    defaultParamsJson: {
      ...defaultParamsJson,
      ...extraParams,
    },
  };
}

function splitMapping(mapping: string): [string, string] {
  const dotIndex = mapping.indexOf(".");
  if (dotIndex === -1) {
    return ["", ""];
  }
  return [mapping.slice(0, dotIndex), mapping.slice(dotIndex + 1)];
}

function extractProviderAppId(input: string): string {
  const match = input.match(/\/run\/ai-app\/(\d+)/);
  return match?.[1] ?? "";
}
