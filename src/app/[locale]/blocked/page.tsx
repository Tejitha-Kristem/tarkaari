import { ShieldAlert } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import type { Locale } from "@/i18n/routing";

export default async function BlockedPage({ params }: PageProps<"/[locale]/blocked">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("blocked");
  return (
    <main className="mx-auto max-w-lg px-4 pt-16">
      <EmptyState icon={ShieldAlert} title={t("title")} body={t("body")} />
    </main>
  );
}
