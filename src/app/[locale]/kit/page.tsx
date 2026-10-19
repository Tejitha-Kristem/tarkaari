import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { KitDemo } from "./kit-demo";

export async function generateMetadata({ params }: PageProps<"/[locale]/kit">) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "kit" });
  return { title: t("title") };
}

async function requestTime() {
  await connection();
  return Date.now();
}

/** Phase 1 review page for the accessibility building blocks. Removed before launch. */
export default async function KitPage({ params }: PageProps<"/[locale]/kit">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <KitDemo serverNow={await requestTime()} />;
}
