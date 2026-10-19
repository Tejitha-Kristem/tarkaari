import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReadAloudButton } from "@/components/read-aloud-button";
import { SubHeader } from "@/components/screen-header";
import type { Locale } from "@/i18n/routing";
import { requireCustomerData, type OrderWithItems } from "@/lib/data/customer";
import { formatQty, rupees, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PayPanel } from "./pay-panel";

export default async function BillPage({ params }: PageProps<"/[locale]/bill/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireCustomerData();
  const { supabase } = data.viewer;
  const { data: order } = await supabase
    .from("orders")
    .select("*, items:order_items(*, catalogue:catalogue_items(name_en, name_kn, photo, category))")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();
  const o = order as OrderWithItems;
  const { data: payments } = await supabase.from("payments").select("*").eq("order_id", o.id);
  const ledger = (await supabase.rpc("my_ledger")).data?.[0];

  const name = (c: { name_en: string; name_kn: string }) => (loc === "kn" ? c.name_kn : c.name_en);
  const date = shortDate(o.delivery_date, loc, { weekday: "long", day: "numeric", month: "short" });
  const ready = o.status === "packed" || o.status === "delivered";
  const total = Number(o.final_total ?? 0);
  const paidHere = (payments ?? []).filter((p) => p.status === "confirmed").reduce((a, p) => a + Number(p.amount), 0);
  const claimedHere = (payments ?? []).filter((p) => p.status === "claimed").reduce((a, p) => a + Number(p.amount), 0);
  const speech = t("bill.speak", {
    date,
    items: o.items
      .filter((i) => i.available)
      .map((i) => t("bill.speakLine", { item: name(i.catalogue), amount: Math.round(Number(i.line_total ?? 0)) }))
      .join(". "),
    total: Math.round(total),
  });

  return (
    <>
      <SubHeader title={t("bill.title")} back="/order" />
      <div className="flex flex-col gap-4 px-4 pb-48">
        <p className="text-muted-foreground">
          {data.vendor?.shop_name} · {t(o.status === "delivered" ? "bill.delivered" : "bill.forDate", { date })}
        </p>
        {!ready ? (
          <p className="rounded-[1.25rem] bg-card p-4 shadow-card">{t("bill.notReady")}</p>
        ) : (
          <>
            <section className="rounded-[1.375rem] bg-card p-4 shadow-card">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b pb-2 text-xs font-semibold text-muted-foreground">
                <span />
                <span className="text-right">{t("bill.actual")}</span>
                <span className="w-16 text-right">{t("bill.amount")}</span>
              </div>
              {o.items.map((i) => (
                <div key={i.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b py-2.5 last:border-0">
                  <div>
                    <p className={cn("leading-tight font-semibold", !i.available && "text-muted-foreground line-through")}>{name(i.catalogue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.available
                        ? `${t("bill.ordered")} ${formatQty(Number(i.qty_ordered))} ${t(`units.${i.unit_snapshot}`)} · ₹${Number(i.final_price)} / ${i.unit_snapshot === "g" ? `100 ${t("units.g")}` : t(`units.${i.unit_snapshot}`)}`
                        : t("bill.notAvailable")}
                    </p>
                  </div>
                  <span className="text-right text-sm font-semibold">
                    {i.available ? `${formatQty(Number(i.qty_actual))} ${t(`units.${i.unit_snapshot}`)}` : "—"}
                  </span>
                  <span className="w-16 text-right font-semibold">{i.available ? rupees(Number(i.line_total)) : "₹0"}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2.5">
                <span>{t("bill.service")}</span>
                <span className="font-semibold">{rupees(Number(o.service_charge))}</span>
              </div>
              <div className="mt-2 flex justify-between border-t pt-3 text-xl">
                <span className="font-semibold">{t("bill.total")}</span>
                <span className="font-bold">{rupees(total)}</span>
              </div>
            </section>
            <ReadAloudButton text={speech} />
            {o.status === "packed" ? (
              <p className="rounded-[1.25rem] bg-secondary p-4 font-semibold">{t("bill.onTheWay")}</p>
            ) : (
            <PayPanel
              orderId={o.id}
              total={total}
              due={Math.max(0, Math.min(total - paidHere - claimedHere, Number(ledger?.balance ?? total) - Number(ledger?.claimed ?? 0)))}
              claimed={claimedHere > 0}
              paid={paidHere >= total}
              monthly={data.terms?.mode === "monthly"}
              upiId={data.vendor?.upi_id ?? null}
              shopName={data.vendor?.shop_name ?? ""}
              note={`Tarkaari ${o.delivery_date}`}
            />
            )}
          </>
        )}
      </div>
    </>
  );
}
