import { describe, expect, it } from "vitest";

import {
  getMaterialsObjectKey,
  getReferencesObjectPrefix,
  getResultsObjectKey,
  resolveStoredObjectKey,
} from "@/lib/object-storage";

describe("object storage helpers", () => {
  it("normalizes stored object keys by trimming leading slashes", () => {
    expect(resolveStoredObjectKey("/task-results/demo/output.png")).toBe("task-results/demo/output.png");
  });

  it("builds task result object keys under the configured prefix", () => {
    expect(getResultsObjectKey("task-123", "result image.png")).toBe("task-results/task-123/result-image.png");
  });

  it("exposes the normalized references prefix", () => {
    expect(getReferencesObjectPrefix()).toBe("references/uploads");
  });

  it("builds material object keys with the configured materials prefix", () => {
    const objectKey = getMaterialsObjectKey("demo video.mp4");
    expect(objectKey.startsWith("materials/")).toBe(true);
    expect(objectKey.endsWith(".mp4")).toBe(true);
  });
});
