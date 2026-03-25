export const MAX_SHOWCASE_IMAGES = 100;

export function normalizeShowcaseImages(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, MAX_SHOWCASE_IMAGES);
}
