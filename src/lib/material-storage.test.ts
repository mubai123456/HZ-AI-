import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveMaterialObjectPath } from "@/lib/material-storage";

const tempObjectKey = "materials/test/material-storage-spec.mp4";
const tempStoragePath = path.join(process.cwd(), "storage", ...tempObjectKey.split("/"));

afterEach(async () => {
  await rm(path.join(process.cwd(), "storage", "materials", "test"), {
    recursive: true,
    force: true,
  });
});

describe("resolveMaterialObjectPath", () => {
  it("returns null for missing local-private files instead of a broken path", () => {
    expect(resolveMaterialObjectPath("local-private", tempObjectKey)).toBeNull();
  });

  it("returns the local-private file path when the file exists", async () => {
    await mkdir(path.dirname(tempStoragePath), { recursive: true });
    await writeFile(tempStoragePath, "video");

    expect(resolveMaterialObjectPath("local-private", tempObjectKey)).toBe(tempStoragePath);
  });
});
