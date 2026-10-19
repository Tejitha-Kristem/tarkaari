"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSwitchLocale } from "@/hooks/use-switch-locale";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * One tap toggles English ⇄ Kannada. The button shows the language you will
 * switch TO, written in that language, so a Kannada reader always sees "ಕನ್ನಡ".
 */
export function LanguageSwitch({ className }: { className?: string }) {
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
        "inline-flex h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-secondary px-4 text-base font-bold active:scale-[0.98] disabled:opacity-60",
        className,
      )}
    >
      <Languages className="size-5" aria-hidden />
      <span lang={next}>{t(next)}</span>
    </button>
  );
}
