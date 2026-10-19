import { ShoppingBag } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { DateTabs } from "@/components/date-tabs";
import { EmptyState } from "@/components/empty-state";
import { SubHeader } from "@/components/screen-header";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { aggregate, flatLabel, requireVendorData, getVendorOrders, pickDate } from "@/lib/data/vendor";
import { formatQty, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BoughtList } from "./bought-list";

export default async function BuyPage({ params, searchParams }: PageProps<"/[locale]/vendor/buy">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireVendorData();
  const { which, date } = pickDate(data, sp.d, data.booking.phase === "locked" ? "next" : "today");
  const tab = sp.tab === "apt" || sp.tab === "houses" ? sp.tab : "all";
  const orders = await getVendorOrders(date);
  const apts = data.apartments.filter((a) => orders.some((o) => o.apartment_id === a.apartment_id));
  const aptId = typeof sp.apt === "string" && apts.some((a) => a.apartment_id === sp.apt) ? sp.apt : apts[0]?.apartment_id;
  const inApt = orders.filter((o) => o.apartment_id === aptId);
  const unit = (u: string) => t(`units.${u}` as "units.kg");
  const dateLabel = shortDate(date, loc, { weekday: "long", day: "numeric", month: "short" });

  const rows = aggregate(tab === "all" ? orders : inApt, loc);
  const shareText = [
    `${t("vendorBuy.title")} · ${dateLabel}`,
    ...rows.map((r) => `${r.name} — ${formatQty(r.qty)} ${unit(r.unit)}`),
  ].join("\n");
  const base = `/vendor/buy?d=${which}`;

  return (
    <>
      <SubHeader title={t("vendorBuy.title")} />
      <div className="flex flex-col gap-4 px-4 pb-10">
        <DateTabs
          path="/vendor/buy"
          which={which}
          today={data.today}
          next={data.nextDate}
          labels={{ today: t("vendor.tabToday"), next: t("vendor.tabNext") }}
          locale={loc}
          extra={tab !== "all" ? `&tab=${tab}` : ""}
        />
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1" role="tablist">
          {(["all", "apt", "houses"] as const).map((k) => (
            <Link
              key={k}
              role="tab"
              aria-selected={tab === k}
              replace
              href={`${base}${k === "all" ? "" : `&tab=${k}`}${aptId && k !== "all" ? `&apt=${aptId}` : ""}`}
              className={cn("flex h-10 items-center justify-center rounded-xl text-sm font-semibold", tab === k ? "bg-card shadow-card" : "text-muted-foreground")}
            >
              {t(k === "all" ? "vendorBuy.tabAll" : k === "apt" ? "vendorBuy.tabApt" : "vendorBuy.tabHouses")}
            </Link>
          ))}
        </div>

        {orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title={t("vendorBuy.empty", { date: dateLabel })} />
        ) : (
          <>
            {tab !== "all" && apts.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {apts.map((a) => (
                  <Link
                    key={a.apartment_id}
                    replace
                    href={`${base}&tab=${tab}&apt=${a.apartment_id}`}
                    className={cn(
                      "flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold",
                      a.apartment_id === aptId ? "bg-primary text-primary-foreground" : "bg-card shadow-card",
                    )}
                  >
                    {a.apartment.name}
                  </Link>
                ))}
              </div>
            )}
            {tab === "houses" ? (
              <div className="flex flex-col gap-3">
                {inApt.map((o) => (
                  <section key={o.id} className="rounded-[1.375rem] bg-card p-4 shadow-card">
                    <p className="flex items-baseline justify-between">
                      <span className="text-lg font-bold">{flatLabel(o.household)}</span>
                      <span className="text-sm text-muted-foreground">{o.household.user?.name}</span>
                    </p>
                    <ul className="mt-2 flex flex-col gap-1">
                      {o.items.map((i) => (
                        <li key={i.id} className={cn("flex justify-between", i.available === false && "text-muted-foreground line-through")}>
                          <span>{loc === "kn" ? i.catalogue.name_kn : i.catalogue.name_en}</span>
                          <span className="font-semibold">
                            {formatQty(Number(i.qty_ordered))} {unit(i.unit_snapshot)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {tab === "all" ? t("vendorBuy.allCaption") : t("vendorBuy.aptCaption")} · {t("vendorBuy.tapBought")}
                </p>
                <BoughtList
                  storageKey={`bought:${data.vendor.id}:${date}:${tab === "all" ? "all" : aptId}`}
                  rows={rows.map((r) => ({
                    id: r.id,
                    name: r.name,
                    alt: r.alt,
                    photo: r.photo,
                    category: r.category,
                    qty: `${formatQty(r.qty)} ${unit(r.unit)}`,
                    houses: t("common.houses", { count: r.houses }),
                  }))}
                  shareText={shareText}
                />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
