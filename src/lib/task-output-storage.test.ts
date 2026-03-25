import { describe, expect, it } from "vitest";

import {
  normalizeTaskOutputStorageMode,
  shouldPersistTaskOutputAssets,
} from "@/lib/task-output-storage";

describe("task output storage mode helpers", () => {
  it("defaults to provider_url for blank or unknown values", () => {
    expect(normalizeTaskOutputStorageMode(undefined)).toBe("provider_url");
    expect(normalizeTaskOutputStorageMode(null)).toBe("provider_url");
    expect(normalizeTaskOutputStorageMode("")).toBe("provider_url");
    expect(normalizeTaskOutputStorageMode("unexpected")).toBe("provider_url");
  });

  it("normalizes object storage mode", () => {
    expect(normalizeTaskOutputStorageMode("object_storage")).toBe("object_storage");
    expect(shouldPersistTaskOutputAssets("object_storage")).toBe(true);
  });

  it("does not persist outputs in provider url mode", () => {
    expect(shouldPersistTaskOutputAssets("provider_url")).toBe(false);
    expect(shouldPersistTaskOutputAssets(undefined)).toBe(false);
  });
});
