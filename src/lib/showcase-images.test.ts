import { describe, expect, it } from "vitest";

import { MAX_SHOWCASE_IMAGES, normalizeShowcaseImages } from "@/lib/showcase-images";

describe("normalizeShowcaseImages", () => {
  it("trims values and caps the showcase image list at 100 items", () => {
    const input = Array.from({ length: MAX_SHOWCASE_IMAGES + 5 }, (_, index) => ` https://example.com/${index}.png `);

    const result = normalizeShowcaseImages(input);

    expect(result).toHaveLength(MAX_SHOWCASE_IMAGES);
    expect(result[0]).toBe("https://example.com/0.png");
    expect(result.at(-1)).toBe(`https://example.com/${MAX_SHOWCASE_IMAGES - 1}.png`);
  });
});
