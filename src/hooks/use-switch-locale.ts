"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/routing";
import { setLanguage } from "@/lib/actions/profile";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Switches UI language: saves it on the profile (when signed in) and in the
 * cookie, then reloads so no screen is left in the old language.
 */
export function useSwitchLocale() {
  const [pending, setPending] = useState(false);

  const switchTo = async (locale: Locale) => {
    setPending(true);
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    try {
      await setLanguage(locale);
    } catch {
      // Not signed in, or offline: the cookie is enough.
    }
    window.location.reload();
  };

  return { switchTo, pending };
}
