type PromptTemplateSnapshot = {
  id: string | null;
  name: string | null;
  templatePrompt: string | null;
};

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function extractPromptTemplateSnapshot(resultJson: unknown): PromptTemplateSnapshot | null {
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
