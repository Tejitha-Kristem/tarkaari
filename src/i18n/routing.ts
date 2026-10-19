import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "kn"],
  defaultLocale: "en",
  // URLs stay clean (/cart, not /kn/cart); the choice lives in the NEXT_LOCALE
  // cookie and, once signed in, in users.language.
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];
