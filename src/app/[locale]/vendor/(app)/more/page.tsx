import { Bell, Building2, ChevronRight, Leaf, Wallet } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InstallApp } from "@/components/install-app";
import { LanguagePicker } from "@/components/language-picker";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoutButton } from "@/components/logout-button";
import { PushToggle } from "@/components/push-toggle";
import { ReportForm } from "@/components/report-form";
import { GreenHeader } from "@/components/screen-header";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireVendorData } from "@/lib/data/vendor";
import { prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ShopSettings } from "./shop-settings";

export default async function VendorMorePage({ params }: PageProps<"/[locale]/vendor/more">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const data = await requireVendorData();
  const { count: unread } = await data.viewer.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("channel", "in_app")
    .is("read_at", null);
  const links = [
    { href: "/vendor/items", icon: Leaf, label: t("vendorMore.items"), tint: "bg-mint" },
    { href: "/vendor/apartments", icon: Building2, label: t("vendorMore.apartments"), tint: "bg-lilac" },
    { href: "/vendor/payments", icon: Wallet, label: t("vendorMore.payments"), tint: "bg-blush" },
    { href: "/notifications", icon: Bell, label: t("notifications.title"), tint: "bg-butter", badge: unread ?? 0 },
  ];

  return (
    <>
      <GreenHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t("vendorMore.title")}</h1>
          <LanguageSwitch onDark />
        </div>
        <div>
          <p className="text-2xl font-semibold">{data.vendor.shop_name}</p>
          <p className="text-sm text-on-dark-muted">
            {data.viewer.profile.name} · {prettyPhone(data.viewer.profile.phone)}
          </p>
        </div>
      </GreenHeader>
      <div className="flex flex-col gap-5 px-4 pt-5 pb-10">
        <ul className="flex flex-col divide-y rounded-[1.375rem] bg-card shadow-card">
          {links.map(({ href, icon: Icon, label, tint, badge }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-16 items-center gap-3 px-4">
                <span aria-hidden className={cn("flex size-10 items-center justify-center rounded-2xl text-primary", tint)}>
                  <Icon className="size-5" />
                </span>
                <span className="flex-1 font-semibold">{label}</span>
                {!!badge && (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-urgent px-1.5 text-xs font-bold text-white">{badge}</span>
                )}
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <ShopSettings shopName={data.vendor.shop_name} upiId={data.vendor.upi_id ?? ""} serviceCharge={Number(data.vendor.service_charge)} />
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t("profile.language")}</h2>
          <LanguagePicker />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t("profile.notifications")}</h2>
          <PushToggle />
        </section>
        <InstallApp variant="row" />
        <ReportForm />
        <LogoutButton />
      </div>
    </>
  );
}
