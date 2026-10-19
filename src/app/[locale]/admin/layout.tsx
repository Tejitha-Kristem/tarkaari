import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoutButton } from "@/components/logout-button";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getViewer } from "@/lib/data/viewer";
import { AdminTabs } from "./tabs";

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const viewer = await getViewer();
  if (!viewer || viewer.profile.role !== "admin" || viewer.profile.status !== "active") redirect({ href: "/", locale: locale as Locale });
  const t = await getTranslations("admin");
  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl pb-16">
      <header className="flex flex-col gap-3 rounded-b-[1.875rem] bg-primary px-4 pt-4 pb-3 text-primary-foreground">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Tarakari · {t("title")}</h1>
          <LanguageSwitch onDark />
        </div>
        <AdminTabs
          tabs={[
            { href: "/admin", label: t("dashboard") },
            { href: "/admin/vendors", label: t("vendors") },
            { href: "/admin/apartments", label: t("apartments") },
            { href: "/admin/customers", label: t("customers") },
            { href: "/admin/orders", label: t("orders") },
            { href: "/admin/reports", label: t("reports") },
          ]}
        />
      </header>
      <div className="px-4 pt-5">{children}</div>
      <div className="px-4 pt-8">
        <LogoutButton />
      </div>
    </div>
  );
}
