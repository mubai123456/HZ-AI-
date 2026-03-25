export function formatNumber(num: number | undefined | null): string {
  if (num == null) return "0";
  if (num >= 10000) {
    // 19900 -> 1.9w, 20000 -> 2.0w
    return (num / 10000).toFixed(1) + "w";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}
