"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSwitchLocale } from "@/hooks/use-switch-locale";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * One tap toggles English ⇄ Kannada. Shows the language you switch TO,
 * written in that language, so a Kannada reader always sees "ಕನ್ನಡ".
 */
export function LanguageSwitch({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const { switchTo, pending } = useSwitchLocale();
  const next: Locale = locale === "en" ? "kn" : "en";

  return (
    <button
      type="button"
      aria-label={t("switchTo")}
      disabled={pending}
      onClick={() => switchTo(next)}
      className={cn(
        "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-60",
        onDark ? "bg-white/12 text-white" : "bg-card text-foreground shadow-card",
        className,
      )}
    >
      <Languages className="size-4" aria-hidden />
      <span lang={next}>{t(next)}</span>
    </button>
  );
}
