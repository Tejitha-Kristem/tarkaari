/** 0.25 → "0.25", 2 → "2", 1.5 → "1.5" (no trailing zeros). */
export function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

/** Whole rupees when exact, otherwise two decimals: 120 → "120", 73.5 → "73.50". */
export function formatRupees(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
