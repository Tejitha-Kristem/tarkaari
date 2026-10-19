"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/routing";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Switches UI language by saving the choice and reloading. URLs carry no
 * locale, so a soft navigation could reuse pages the router cached in the old
 * language; a reload guarantees every screen comes back in the new one.
 */
export function useSwitchLocale() {
  const [pending, setPending] = useState(false);

  const switchTo = (locale: Locale) => {
    setPending(true);
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    window.location.reload();
  };

  return { switchTo, pending };
}
