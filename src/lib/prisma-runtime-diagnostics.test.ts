import {
  buildSchemaMismatchUserMessage,
  getPrismaSchemaMismatchTarget,
  isPrismaSchemaMismatchError,
} from "@/lib/prisma-runtime-diagnostics";

describe("isPrismaSchemaMismatchError", () => {
  it("detects Prisma missing table errors by code", () => {
    const error = Object.assign(new Error("table missing"), {
      code: "P2021",
      meta: { table: "AppTag" },
    });

    expect(isPrismaSchemaMismatchError(error)).toBe(true);
    expect(getPrismaSchemaMismatchTarget(error)).toBe("AppTag");
  });

  it("detects Prisma missing column errors by code", () => {
    const error = Object.assign(new Error("column missing"), {
      code: "P2022",
      meta: { column: "App.estimatedPriceFen" },
    });

    expect(isPrismaSchemaMismatchError(error)).toBe(true);
    expect(getPrismaSchemaMismatchTarget(error)).toBe("App.estimatedPriceFen");
  });

  it("detects sqlite-style missing table messages as schema mismatch", () => {
    const error = new Error("SQLITE_ERROR: no such table: AppTag");

    expect(isPrismaSchemaMismatchError(error)).toBe(true);
  });

  it("ignores unrelated runtime errors", () => {
    expect(isPrismaSchemaMismatchError(new Error("network timeout"))).toBe(false);
  });
});

describe("buildSchemaMismatchUserMessage", () => {
  it("gives an actionable migration hint for operators", () => {
    expect(buildSchemaMismatchUserMessage("应用配置")).toContain("prisma migrate deploy");
    expect(buildSchemaMismatchUserMessage("应用配置")).toContain("Vercel");
  });
});
