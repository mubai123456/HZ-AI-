export function formatPriceFen(value: number | null | undefined): string {
  const fen = Number.isFinite(value) ? Math.max(0, Math.trunc(value ?? 0)) : 0;
  return `¥${(fen / 100).toFixed(2)}`;
}

export function parsePriceYuanToFen(value: unknown): number {
  const normalized =
    typeof value === "number"
      ? value.toFixed(2)
      : String(value ?? "")
          .trim()
          .replace(/^¥\s*/, "");

  if (!normalized) {
    throw new Error("预计费用不能为空");
  }

  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("预计费用格式不正确，最多支持两位小数");
  }

  const [yuanPart, decimalPart = ""] = normalized.split(".");
  const fen = Number(yuanPart) * 100 + Number(decimalPart.padEnd(2, "0"));

  if (!Number.isSafeInteger(fen) || fen < 0) {
    throw new Error("预计费用超出允许范围");
  }

  return fen;
}
