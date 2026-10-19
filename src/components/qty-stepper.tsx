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
  /** Item name, used in screen-reader labels. */
  itemName: string;
  max?: number;
  disabled?: boolean;
  className?: string;
};

/**
 * "+ Add" at zero, then a filled "− qty +" bar. In narrow tiles the unit is
 * dropped from the bar (the price line above already shows it); screen readers
 * always hear the full quantity with its unit.
 */
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
          "inline-flex h-14 w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-primary bg-card text-lg font-extrabold text-primary uppercase active:scale-[0.98] disabled:opacity-50",
          className,
        )}
      >
        <Plus className="size-5" strokeWidth={3.5} aria-hidden />
        {t("common.add")}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "@container flex h-14 w-full items-stretch overflow-hidden rounded-2xl bg-primary text-primary-foreground",
        className,
      )}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled}
        aria-label={t("a11y.decrease", { item: itemName, unit: unitLabel })}
        className="flex w-12 shrink-0 items-center justify-center active:bg-black/15 disabled:opacity-50"
      >
        <Minus className="size-6" strokeWidth={3.5} aria-hidden />
      </button>
      <output
        aria-live="polite"
        aria-label={t("a11y.quantity", { qty: formatQty(value), unit: unitLabel })}
        className="flex min-w-0 flex-1 items-center justify-center gap-1 text-lg leading-none font-extrabold whitespace-nowrap tabular-nums"
      >
        {formatQty(value)}
        <span className="hidden @[11rem]:inline">{unitLabel}</span>
      </output>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label={plusLabel}
        className="flex w-12 shrink-0 items-center justify-center active:bg-black/15 disabled:opacity-50"
      >
        <Plus className="size-6" strokeWidth={3.5} aria-hidden />
      </button>
    </div>
  );
}
