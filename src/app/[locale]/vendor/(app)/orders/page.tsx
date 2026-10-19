import { ClipboardList } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { DateTabs } from "@/components/date-tabs";
import { EmptyState } from "@/components/empty-state";
import { SubHeader } from "@/components/screen-header";
import type { Locale } from "@/i18n/routing";
import { flatLabel, requireVendorData, getVendorOrders, pickDate } from "@/lib/data/vendor";
import { formatQty, formatRange, shortDate } from "@/lib/format";
import { OrdersBoard } from "./orders-board";

export default async function VendorOrdersPage({ params, searchParams }: PageProps<"/[locale]/vendor/orders">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireVendorData();
  const { which, date } = pickDate(data, sp.d, "next");
  const orders = await getVendorOrders(date);
  // Customers can edit until 5 pm the day before delivery; only after that can the vendor accept.
  const locked = which === "today" || data.booking.phase === "locked";
  const dateLabel = shortDate(date, loc, { weekday: "long", day: "numeric", month: "short" });
  const name = (c: { name_en: string; name_kn: string }) => (loc === "kn" ? c.name_kn : c.name_en);

  const groups = data.apartments
    .map((a) => ({
      id: a.apartment_id,
      name: a.apartment.name,
      orders: orders
        .filter((o) => o.apartment_id === a.apartment_id)
        .map((o) => ({
          id: o.id,
          flat: flatLabel(o.household),
          customer: o.household.user?.name ?? "",
          status: o.status,
          estimate: formatRange(Number(o.est_min), Number(o.est_max)),
          items: o.items.map((i) => ({
            id: i.id,
            name: name(i.catalogue),
            qty: `${formatQty(Number(i.qty_ordered))} ${t(`units.${i.unit_snapshot}`)}`,
            available: i.available,
          })),
        })),
    }))
    .filter((g) => g.orders.length);

  return (
    <>
      <SubHeader title={t("vendorOrders.title")} />
      <div className="flex flex-col gap-4 px-4 pb-44">
        <DateTabs
          path="/vendor/orders"
          which={which}
          today={data.today}
          next={data.nextDate}
          labels={{ today: t("vendor.tabToday"), next: t("vendor.tabNext") }}
          locale={loc}
        />
        {orders.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t("vendorOrders.empty", { date: dateLabel })} />
        ) : (
          <OrdersBoard date={date} locked={locked} groups={groups} />
        )}
      </div>
    </>
  );
}
