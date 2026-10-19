import { Bell, ChevronRight, MessageCircle, Phone, Store } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { InstallApp } from "@/components/install-app";
import { LanguagePicker } from "@/components/language-picker";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoutButton } from "@/components/logout-button";
import { PushToggle } from "@/components/push-toggle";
import { ReportForm } from "@/components/report-form";
import { GreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireCustomerData, type OrderWithItems } from "@/lib/data/customer";
import { prettyPhone, rupees, shortDate, windowLabel } from "@/lib/format";
import { joinLink, whatsappShare } from "@/lib/site";
import { RepeatButton } from "./repeat-button";
import { VendorChooser } from "./vendor-chooser";

export default async function ProfilePage({ params }: PageProps<"/[locale]/profile">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireCustomerData();
  const { supabase, profile } = data.viewer;
  const h = data.household;

  const [historyRes, choicesRes, unreadRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*, items:order_items(*, catalogue:catalogue_items(name_en, name_kn, photo, category))")
      .eq("household_id", h.id)
      .neq("status", "cancelled")
      .order("delivery_date", { ascending: false })
      .limit(8),
    supabase
      .from("vendor_apartments")
      .select("invite_code, delivery_window_start, delivery_window_end, vendor:vendors!inner(id, shop_name, service_charge, approval_status)")
      .eq("apartment_id", h.apartment_id)
      .eq("active", true)
      .eq("vendor.approval_status", "active"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("channel", "in_app").is("read_at", null),
  ]);
  const history = (historyRes.data ?? []) as OrderWithItems[];
  const choices = (choicesRes.data ?? []).filter((c) => c.vendor);
  const mine = choices.find((c) => c.vendor!.id === data.vendor?.id);
  const apartment = h.apartment?.name ?? "";
  const invite = mine?.invite_code
    ? whatsappShare(t("vendor.remindText", { shop: data.vendor!.shop_name, apartment, link: joinLink(mine.invite_code) }))
    : h.apartment?.invite_code
      ? whatsappShare(t("onboarding.inviteText", { apartment, link: joinLink(h.apartment.invite_code) }))
      : null;
  const available = new Set(data.items.filter((i) => i.available).map((i) => i.vendorItemId));
  const name = (c: { name_en: string; name_kn: string }) => (loc === "kn" ? c.name_kn : c.name_en);
  const unread = unreadRes.count ?? 0;

  return (
    <>
      <GreenHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t("profile.title")}</h1>
          <LanguageSwitch onDark />
        </div>
        <div>
          <p className="text-2xl font-semibold">{profile.name}</p>
          <p className="text-sm text-on-dark-muted">
            {[h.block, h.flat_no].filter(Boolean).join("-")} · {apartment}
          </p>
          <p className="text-sm text-on-dark-muted">{prettyPhone(profile.phone)}</p>
        </div>
      </GreenHeader>

      <div className="flex flex-col gap-5 px-4 pt-5 pb-10">
        <Link href="/notifications" className="flex min-h-14 items-center gap-3 rounded-[1.375rem] bg-card px-4 shadow-card">
          <Bell className="size-5 text-primary" aria-hidden />
          <span className="flex-1 font-semibold">{t("notifications.title")}</span>
          {unread > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-urgent px-1.5 text-xs font-bold text-white">{unread}</span>
          )}
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
        </Link>

        <section className="flex flex-col gap-3 rounded-[1.375rem] bg-card p-4 shadow-card">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("profile.myVendor")}</h2>
          {data.vendor ? (
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex size-12 items-center justify-center rounded-2xl bg-mint text-primary">
                <Store className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg leading-tight font-semibold">{data.vendor.shop_name}</p>
                {data.terms && (
                  <p className="text-sm text-muted-foreground">
                    {t("profile.vendorTerms", {
                      window: windowLabel(data.terms.windowStart, data.terms.windowEnd, loc),
                      charge: Number(data.vendor.service_charge),
                    })}
                  </p>
                )}
              </div>
              {data.vendorPhone && (
                <Button asChild variant="dark" size="icon" aria-label={t("common.call")}>
                  <a href={`tel:+${data.vendorPhone}`}>
                    <Phone aria-hidden />
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <p>{t("onboarding.noVendorTitle")}</p>
          )}
          {choices.length > 1 || (!data.vendor && choices.length > 0) ? (
            <VendorChooser
              current={data.vendor?.id ?? null}
              options={choices.map((c) => ({
                id: c.vendor!.id,
                name: c.vendor!.shop_name,
                sub: t("onboarding.deliversAt", {
                  window: windowLabel(c.delivery_window_start, c.delivery_window_end, loc),
                  charge: Number(c.vendor!.service_charge),
                }),
              }))}
            />
          ) : null}
        </section>

        {invite && (
          <Button asChild variant="outline" className="justify-start">
            <a href={invite} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden />
              {t("profile.invite")}
            </a>
          </Button>
        )}

        {history.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{t("profile.history")}</h2>
            <ul className="flex flex-col divide-y rounded-[1.375rem] bg-card shadow-card">
              {history.map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {shortDate(o.delivery_date, loc, { weekday: "short", day: "numeric", month: "short" })}
                      <span className="font-normal text-muted-foreground">
                        {" · "}
                        {o.final_total != null ? rupees(Number(o.final_total)) : t(`orderStatus.${o.status}`)}
                      </span>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{o.items.map((i) => name(i.catalogue)).join(", ")}</p>
                  </div>
                  <RepeatButton
                    items={o.items.filter((i) => available.has(i.vendor_item_id)).map((i) => [i.vendor_item_id, Number(i.qty_ordered)])}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

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
