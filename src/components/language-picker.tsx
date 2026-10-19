"use client";

import { Check } from "lucide-react";
import { useLocale } from "next-intl";
import { useSwitchLocale } from "@/hooks/use-switch-locale";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const names: Record<Locale, { label: string; sample: string }> = {
  en: { label: "English", sample: "Vegetables" },
  kn: { label: "ಕನ್ನಡ", sample: "ತರಕಾರಿ" },
};

/** Two large choices, each written in its own language. */
export function LanguagePicker() {
  const locale = useLocale();
  const { switchTo, pending } = useSwitchLocale();

  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-3">
      {routing.locales.map((l) => {
        const selected = l === locale;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={selected}
            lang={l}
            disabled={pending}
            onClick={() => !selected && switchTo(l)}
            className={cn(
              "flex h-20 items-center gap-3 rounded-[1.375rem] px-4 text-left transition-colors active:scale-[0.99]",
              selected ? "bg-primary text-primary-foreground" : "bg-card shadow-card",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full",
                selected ? "bg-accent text-accent-foreground" : "border-2 border-input",
              )}
            >
              {selected && <Check className="size-4" strokeWidth={3} />}
            </span>
            <span className="flex flex-col">
              <span className="text-lg font-semibold">{names[l].label}</span>
              <span className={cn("text-sm", selected ? "text-on-dark-muted" : "text-muted-foreground")}>{names[l].sample}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
