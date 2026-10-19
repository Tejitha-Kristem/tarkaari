"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex h-12 items-center rounded-full bg-secondary p-1">
        <button type="button" aria-label={`${label} −`} onClick={() => onChange(Math.max(1, value - 1))} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card">
          <Minus className="size-4" aria-hidden />
        </button>
        <input
          inputMode="numeric"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
          className="min-w-0 flex-1 bg-transparent text-center text-lg font-semibold outline-none"
        />
        <button type="button" aria-label={`${label} +`} onClick={() => onChange(value + 1)} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card">
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** ₹ from / to with big steppers; keeps from ≤ to. */
export function PriceRangeEditor({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  const t = useTranslations("vendorSetup");
  return (
    <div className="flex gap-2">
      <Stepper label={`₹ ${t("priceFrom")}`} value={min} onChange={(v) => onChange(v, Math.max(v, max))} />
      <Stepper label={`₹ ${t("priceTo")}`} value={max} onChange={(v) => onChange(Math.min(min, v), v)} />
    </div>
  );
}
