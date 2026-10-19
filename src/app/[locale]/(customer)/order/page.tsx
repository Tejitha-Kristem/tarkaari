import { Check, ClipboardList, Phone } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { ReadAloudButton } from "@/components/read-aloud-button";
import { SubHeader } from "@/components/screen-header";
import { StatusMark } from "@/components/status-mark";
import { Button } from "@/components/ui/button";
import { VegImage } from "@/components/veg-image";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireCustomerData } from "@/lib/data/customer";
import { formatQty, formatRange, rupees, shortDate, windowLabel } from "@/lib/format";
import { vendorAcceptDeadline } from "@/lib/time";
import { cn } from "@/lib/utils";
import { CancelOrderButton } from "./cancel-order-button";

const STEPS = ["placed", "accepted", "packed", "delivered"] as const;

export default async function OrderPage({ params }: PageProps<"/[locale]/order">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireCustomerData();
  const vendor = data.vendor;
  const window = data.terms ? windowLabel(data.terms.windowStart, data.terms.windowEnd, loc) : "";

  return (
    <>
      <SubHeader title={t("order.title")} />
      <div className="flex flex-col gap-5 px-4 pb-10">
        {data.upcoming.length === 0 && (
          <EmptyState icon={ClipboardList} title={t("order.none")} body={t("order.noneBody")}>
            <Button asChild>
              <Link href="/shop">{t("cart.goShop")}</Link>
            </Button>
          </EmptyState>
        )}
        {data.upcoming.map((order) => {
          const step = STEPS.indexOf(order.status as (typeof STEPS)[number]);
          const date = shortDate(order.delivery_date, loc, { weekday: "long", day: "numeric", month: "short" });
          const editable = order.status === "placed" && order.delivery_date === data.bookableDate && data.booking.phase === "open";
          const lateAccept = order.status === "placed" && data.booking.now > vendorAcceptDeadline(order.delivery_date).getTime();
          const name = (c: { name_en: string; name_kn: string }) => (loc === "kn" ? c.name_kn : c.name_en);
          const speech = t("order.speak", {
            date,
            items: order.items.map((i) => `${name(i.catalogue)} ${formatQty(Number(i.qty_ordered))} ${t(`units.${i.unit_snapshot}`)}`).join(", "),
            min: Math.round(Number(order.est_min)),
            max: Math.round(Number(order.est_max)),
          });
          return (
            <section key={order.id} className="flex flex-col gap-4 rounded-[1.5rem] bg-card p-4 shadow-card">
              <div>
                <p className="text-lg font-semibold">{date}</p>
                <p className="text-sm text-muted-foreground">
                  {vendor?.shop_name}
                  {window ? ` · ${window}` : ""}
                </p>
              </div>
              <ol className="grid grid-cols-4 gap-1" aria-label={t(`orderStatus.${order.status}`)}>
                {STEPS.map((s, n) => (
                  <li key={s} className="flex flex-col items-center gap-1.5 text-center">
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full",
                        n <= step ? "bg-success text-white" : "border-2 border-dashed border-input text-transparent",
                      )}
                      aria-hidden
                    >
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                    <span className={cn("text-xs leading-tight", n <= step ? "font-semibold" : "text-muted-foreground")}>{t(`orderStatus.${s}`)}</span>
                  </li>
                ))}
              </ol>
              {order.status === "placed" && (
                <p className={cn("rounded-2xl p-3 text-sm font-semibold", lateAccept ? "bg-urgent-soft text-urgent" : "bg-secondary")}>
                  {lateAccept ? t("order.lateWarn", { vendor: vendor?.shop_name ?? "" }) : t("order.waitAccept", { vendor: vendor?.shop_name ?? "" })}
                </p>
              )}
              <ul className="flex flex-col divide-y">
                {order.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2.5">
                    <VegImage photo={i.catalogue.photo} category={i.catalogue.category} className={cn("size-12 shrink-0 rounded-xl", i.available === false && "opacity-40")} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("leading-tight font-semibold", i.available === false && "text-muted-foreground line-through")}>{name(i.catalogue)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatQty(Number(i.qty_ordered))} {t(`units.${i.unit_snapshot}`)}
                      </p>
                    </div>
                    {i.available !== null && <StatusMark available={i.available} />}
                  </li>
                ))}
              </ul>
              <div className="flex justify-between text-lg">
                <span className="font-semibold">{order.final_total != null ? t("order.finalTotal") : t("order.estimate")}</span>
                <span className="font-bold">
                  {order.final_total != null ? rupees(Number(order.final_total)) : formatRange(Number(order.est_min), Number(order.est_max))}
                </span>
              </div>
              <ReadAloudButton text={speech} />
              {editable && (
                <>
                  <p className="text-center text-sm text-muted-foreground">{t("order.changeUntil")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="dark">
                      <Link href="/shop">{t("order.edit")}</Link>
                    </Button>
                    <CancelOrderButton orderId={order.id} dateLabel={date} />
                  </div>
                </>
              )}
              {(order.status === "packed" || order.status === "delivered") && (
                <Button asChild size="lg">
                  <Link href={`/bill/${order.id}`}>{t("order.seeBill")}</Link>
                </Button>
              )}
              {lateAccept && data.vendorPhone && (
                <Button asChild variant="outline">
                  <a href={`tel:+${data.vendorPhone}`}>
                    <Phone aria-hidden />
                    {t("common.call")}
                  </a>
                </Button>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
