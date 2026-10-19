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

/** Onboarding step 1: two large choices, each written in its own language. */
export function LanguagePicker() {
  const locale = useLocale();
  const { switchTo, pending } = useSwitchLocale();

  return (
    <div role="radiogroup" className="grid gap-3">
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
              "flex h-20 items-center gap-4 rounded-[1.25rem] border-2 px-5 text-left transition-colors active:scale-[0.99]",
              selected ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full border-2",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
              )}
            >
              {selected && <Check className="size-6" strokeWidth={3} />}
            </span>
            <span className="flex flex-col">
              <span className="text-xl font-bold">{names[l].label}</span>
              <span className="text-sm text-muted-foreground">{names[l].sample}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
