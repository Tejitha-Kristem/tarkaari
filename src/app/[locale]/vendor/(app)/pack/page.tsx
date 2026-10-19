import { ChevronRight, Package } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { DateTabs } from "@/components/date-tabs";
import { EmptyState } from "@/components/empty-state";
import { SubHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { flatLabel, requireVendorData, getVendorOrders, pickDate } from "@/lib/data/vendor";
import { rupees, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function PackPage({ params, searchParams }: PageProps<"/[locale]/vendor/pack">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireVendorData();
  const { which, date } = pickDate(data, sp.d, "today");
  const orders = await getVendorOrders(date);
  const dateLabel = shortDate(date, loc, { weekday: "long", day: "numeric", month: "short" });
  const label = { placed: "notAccepted", accepted: "toPack", packed: "packed", delivered: "delivered" } as const;
  const variant = { placed: "outline", accepted: "warning", packed: "info", delivered: "success" } as const;

  return (
    <>
      <SubHeader title={t("vendorPack.title")} />
      <div className="flex flex-col gap-4 px-4 pb-10">
        <DateTabs
          path="/vendor/pack"
          which={which}
          today={data.today}
          next={data.nextDate}
          labels={{ today: t("vendor.tabToday"), next: t("vendor.tabNext") }}
          locale={loc}
        />
        {orders.length === 0 ? (
          <EmptyState icon={Package} title={t("vendorPack.empty", { date: dateLabel })} />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t("vendorPack.hint")}</p>
            {data.apartments
              .filter((a) => orders.some((o) => o.apartment_id === a.apartment_id))
              .map((a) => (
                <section key={a.apartment_id} className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold">{a.apartment.name}</h2>
                  <ul className="flex flex-col gap-2">
                    {orders
                      .filter((o) => o.apartment_id === a.apartment_id)
                      .map((o) => {
                        const status = o.status as keyof typeof label;
                        const missing = o.items.filter((i) => i.available === false).length;
                        return (
                          <li key={o.id}>
                            <Link
                              href={`/vendor/pack/${o.id}?d=${which}`}
                              className={cn("flex min-h-16 items-center gap-3 rounded-[1.25rem] bg-card p-3 shadow-card", status === "delivered" && "opacity-70")}
                            >
                              <span className="rounded-xl bg-primary px-3 py-1.5 text-lg font-bold text-primary-foreground">{flatLabel(o.household)}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{o.household.user?.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {t("common.items", { count: o.items.length - missing })}
                                  {o.final_total != null && ` · ${rupees(Number(o.final_total))}`}
                                </span>
                              </span>
                              <Badge variant={variant[status]}>{t(`vendorPack.${label[status]}`)}</Badge>
                              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                            </Link>
                          </li>
                        );
                      })}
                  </ul>
                </section>
              ))}
          </>
        )}
      </div>
    </>
  );
}
