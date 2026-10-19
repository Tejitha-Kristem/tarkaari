import { MapPin, PauseCircle, Share2, Store } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { BookingStrip } from "@/components/booking-strip";
import { EmptyState } from "@/components/empty-state";
import { LanguageSwitch } from "@/components/language-switch";
import { GreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireCustomerData, orderToCart } from "@/lib/data/customer";
import { shortDate } from "@/lib/format";
import { joinLink, whatsappShare } from "@/lib/site";
import { ShopView } from "./shop-view";

export default async function ShopPage({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const data = await requireCustomerData();
  const { household, vendor } = data;
  const apt = household.apartment;
  const address = `${household.block ? `${household.block}-` : ""}${household.flat_no}, ${apt?.name ?? ""}`;

  const header = (
    <GreenHeader>
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/12">
          <MapPin className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-on-dark-muted">{t("shop.deliverTo")}</p>
          <p className="truncate font-semibold">{address}</p>
        </div>
        <LanguageSwitch onDark />
      </div>
    </GreenHeader>
  );

  if (!vendor || vendor.approval_status !== "active") {
    const { data: aptRow } = await data.viewer.supabase.from("apartments").select("invite_code").eq("id", household.apartment_id).maybeSingle();
    return (
      <>
        {header}
        <div className="px-4 pt-5">
          <EmptyState icon={Store} title={t("shop.noVendorTitle")} body={t("shop.noVendorBody")}>
            {aptRow && (
              <Button asChild variant="dark">
                <a href={whatsappShare(t("onboarding.inviteText", { apartment: apt?.name ?? "", link: joinLink(aptRow.invite_code) }))} target="_blank" rel="noreferrer">
                  <Share2 aria-hidden />
                  {t("onboarding.shareWhatsApp")}
                </a>
              </Button>
            )}
          </EmptyState>
        </div>
      </>
    );
  }

  const last = data.lastOrder;
  const lastCart = orderToCart(last);
  const repeatable = Object.fromEntries(
    Object.entries(lastCart).filter(([id]) => data.items.some((i) => i.vendorItemId === id && i.available)),
  );
  const repeatPhotos = (last?.items ?? []).map((i) => i.catalogue).filter((c) => c.photo && /\.webp|\.jpe?g|\.png/.test(c.photo)).slice(0, 2);

  return (
    <>
      {header}
      <div className="flex flex-col gap-4 px-4 pt-4">
        <BookingStrip booking={data.booking} />
        {household.paused && (
          <div className="flex items-center gap-3 rounded-[1.25rem] bg-urgent-soft p-3">
            <PauseCircle className="size-6 shrink-0 text-urgent" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold">{t("shop.pausedTitle")}</p>
              <p className="text-sm">{t("shop.pausedBody", { vendor: vendor.shop_name })}</p>
            </div>
            <Button asChild size="sm" variant="dark">
              <Link href="/payments">{t("shop.payDues")}</Link>
            </Button>
          </div>
        )}
        {data.holiday && (
          <p className="rounded-[1.25rem] bg-butter p-3 font-semibold">
            {t("shop.holiday", { vendor: vendor.shop_name, date: shortDate(data.bookableDate, locale) })}
          </p>
        )}
        {data.editableOrder && (
          <Link href="/order" className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-mint p-3">
            <span className="text-sm font-semibold">
              {t("shop.orderPlacedBanner", { date: shortDate(data.bookableDate, locale) })}
            </span>
            <span className="shrink-0 text-sm font-semibold text-primary underline">{t("shop.seeOrder")}</span>
          </Link>
        )}
      </div>
      <ShopView
        items={data.items}
        repeatable={repeatable}
        repeatPhotos={repeatPhotos.map((c) => c.photo!)}
        locale={await getLocale()}
        disabled={household.paused}
      />
    </>
  );
}
