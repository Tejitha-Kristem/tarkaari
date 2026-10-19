import type { Enums } from "@/types/database";

/** 0.25 → "0.25", 2 → "2", 1.5 → "1.5" (no trailing zeros). */
export function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

/** Whole rupees when exact, otherwise two decimals, Indian grouping: 1240 → "₹1,240", 73.5 → "₹73.50". */
export function rupees(n: number): string {
  const v = Number(n);
  return "₹" + (Number.isInteger(v)
    ? v.toLocaleString("en-IN")
    : v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

/** ₹30–40 */
export function formatRange(min: number, max: number): string {
  const r = (v: number) => Math.round(Number(v)).toLocaleString("en-IN");
  return Math.round(min) === Math.round(max) ? `₹${r(min)}` : `₹${r(min)}–${r(max)}`;
}

/** Price basis: "kg", "100 g", "bunch". */
export function perUnitLabel(unit: Enums<"item_unit">, unitLabel: string, gramLabel: string): string {
  return unit === "g" ? `100 ${gramLabel}` : unitLabel;
}

export const unitBasis = (unit: Enums<"item_unit">) => (unit === "g" ? 100 : 1);

/** How much one tap of "+" adds (mirrors public.default_step). */
export const defaultStep = (unit: Enums<"item_unit">) => (unit === "kg" ? 0.25 : unit === "g" ? 100 : 1);

/** Estimated line amount range for a quantity. */
export function lineRange(qty: number, unit: Enums<"item_unit">, min: number, max: number) {
  const b = unitBasis(unit);
  return { lo: (qty * min) / b, hi: (qty * max) / b };
}

/** "07:00:00"–"09:00:00" → "7–9 am" / "ಬೆಳಿಗ್ಗೆ 7–9". */
export function windowLabel(start: string, end: string, locale: string): string {
  const h = (t: string) => {
    const [hh, mm] = t.split(":").map(Number);
    const h12 = ((hh + 11) % 12) + 1;
    return mm ? `${h12}:${String(mm).padStart(2, "0")}` : String(h12);
  };
  const pm = Number(end.split(":")[0]) >= 12;
  if (locale === "kn") return `${pm ? "ಮಧ್ಯಾಹ್ನ" : "ಬೆಳಿಗ್ಗೆ"} ${h(start)}–${h(end)}`;
  return `${h(start)}–${h(end)} ${pm ? "pm" : "am"}`;
}

/** Date in the viewer's language, IST: "Tue, 20 Oct". */
export function shortDate(isoDate: string, locale: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat(locale === "kn" ? "kn-IN" : "en-IN", { ...opts, timeZone: "Asia/Kolkata" }).format(
    // A plain date means that day in India (noon avoids edge cases); a timestamp is used as is.
    new Date(isoDate.length === 10 ? `${isoDate}T12:00:00+05:30` : isoDate),
  );
}

/** Indian mobile in groups: "9000000001" → "90000 00001". */
export function prettyPhone(phone: string | null): string {
  const d = (phone ?? "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : (phone ?? "");
}
