"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  step: number;
  onChange: (next: number) => void;
  /** Translated unit label, e.g. "kg" or "ಕಟ್ಟು". */
  unitLabel: string;
  itemName: string;
  max?: number;
  disabled?: boolean;
  className?: string;
};

/** Lime "+ Add" at zero, then a forest "− qty +" pill. */
export function QtyStepper({ value, step, onChange, unitLabel, itemName, max = 99, disabled, className }: Props) {
  const t = useTranslations();
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const inc = () => onChange(Math.min(round(value + step), max));
  const dec = () => onChange(Math.max(round(value - step), 0));
  const plusLabel = t("a11y.increase", { item: itemName, unit: unitLabel });

  if (value <= 0) {
    return (
      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        aria-label={plusLabel}
        className={cn(
          "inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-accent text-base font-semibold text-accent-foreground active:scale-[0.98] disabled:opacity-50",
          className,
        )}
      >
        <Plus className="size-5" strokeWidth={2.8} aria-hidden />
        {t("common.add")}
      </button>
    );
  }

  return (
    <div className={cn("flex h-12 w-full items-center rounded-full bg-primary p-1 text-primary-foreground", className)}>
      <button
        type="button"
        onClick={dec}
        disabled={disabled}
        aria-label={t("a11y.decrease", { item: itemName, unit: unitLabel })}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/14 active:bg-white/25 disabled:opacity-50"
      >
        <Minus className="size-5" strokeWidth={2.8} aria-hidden />
      </button>
      <output
        aria-live="polite"
        aria-label={t("a11y.quantity", { qty: formatQty(value), unit: unitLabel })}
        className="min-w-0 flex-1 truncate text-center text-base font-semibold tabular-nums"
      >
        {formatQty(value)} {unitLabel}
      </output>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label={plusLabel}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground active:bg-accent/80 disabled:opacity-50"
      >
        <Plus className="size-5" strokeWidth={2.8} aria-hidden />
      </button>
    </div>
  );
}
