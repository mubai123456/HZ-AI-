import type { PromptTemplateInputVariables } from "@/lib/types";

const PROVIDER_OPTION_KEYS = ["instanceType", "usePersonalQueue"] as const;
const TEMPLATE_INPUT_VARIABLE_PATTERN = /{{\s*input\.([a-zA-Z0-9_]+)\s*}}/g;

function normalizePromptText(value: string | null | undefined) {
  return value?.trim() || "";
}

function cleanupPromptOutput(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/^[A-Za-z0-9_\-\u4e00-\u9fff \t\u3000]{1,24}[：:][ \t]*$/gmu, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildPromptTemplateInputVariables(
  formData: Record<string, string | string[]>,
): PromptTemplateInputVariables {
  return Object.entries(formData).reduce<PromptTemplateInputVariables>((acc, [key, rawValue]) => {
    const normalizedValue = Array.isArray(rawValue)
      ? rawValue.map((item) => item.trim()).filter(Boolean).join(", ")
      : rawValue.trim();

    if (normalizedValue) {
      acc[key] = normalizedValue;
    }

    return acc;
  }, {});
}

export function composePromptSegments(input: {
  templatePrompt?: string | null;
  userPrompt?: string | null;
  inputVariables?: PromptTemplateInputVariables;
}) {
  const templatePrompt = normalizePromptText(input.templatePrompt);
  const userPrompt = normalizePromptText(input.userPrompt);
  const inputVariables = input.inputVariables ?? {};

  if (TEMPLATE_INPUT_VARIABLE_PATTERN.test(templatePrompt)) {
    TEMPLATE_INPUT_VARIABLE_PATTERN.lastIndex = 0;
    const replacedPrompt = templatePrompt.replace(TEMPLATE_INPUT_VARIABLE_PATTERN, (_, key: string) =>
      normalizePromptText(inputVariables[key]),
    );

    return cleanupPromptOutput(replacedPrompt);
  }

  return cleanupPromptOutput([templatePrompt, userPrompt].filter(Boolean).join("\n\n"));
}

export function extractProviderSubmitOptions(
  defaultParamsJson: Record<string, string>,
  fieldKeys: string[],
) {
  const fieldKeySet = new Set(fieldKeys);

  return PROVIDER_OPTION_KEYS.reduce<Record<string, string>>((acc, key) => {
    const value = defaultParamsJson[key];
    if (value && !fieldKeySet.has(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
}
