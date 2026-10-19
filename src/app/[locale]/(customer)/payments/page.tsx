import { ReceiptText } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { GreenHeader } from "@/components/screen-header";
import { LanguageSwitch } from "@/components/language-switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireCustomerData } from "@/lib/data/customer";
import { rupees, shortDate } from "@/lib/format";
import { PayBalance } from "./pay-balance";

export default async function PaymentsPage({ params }: PageProps<"/[locale]/payments">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireCustomerData();
  const { supabase } = data.viewer;
  const [ledgerRes, billsRes, paysRes] = await Promise.all([
    supabase.rpc("my_ledger"),
    supabase
      .from("orders")
      .select("id, delivery_date, final_total, status")
      .eq("household_id", data.household.id)
      .in("status", ["packed", "delivered"])
      .order("delivery_date", { ascending: false })
      .limit(30),
    supabase.from("payments").select("id, amount, method, status, created_at").eq("household_id", data.household.id).order("created_at", { ascending: false }).limit(30),
  ]);
  const ledger = ledgerRes.data?.[0];
  const balance = Number(ledger?.balance ?? 0);
  const claimed = Number(ledger?.claimed ?? 0);
  const toPay = Math.max(0, balance - claimed);
  const bills = billsRes.data ?? [];
  const pays = paysRes.data ?? [];

  return (
    <>
      <GreenHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t("payments.title")}</h1>
          <LanguageSwitch onDark />
        </div>
        <div>
          <p className="text-sm text-on-dark-muted">{toPay > 0 ? t("payments.balance") : t("payments.nothingDue")}</p>
          <p className="text-4xl font-bold">{rupees(toPay)}</p>
          {claimed > 0 && <p className="mt-1 text-sm text-on-dark-muted">{t("payments.claimedNote", { amount: rupees(claimed) })}</p>}
        </div>
      </GreenHeader>
      <div className="flex flex-col gap-5 px-4 pt-5 pb-10">
        {toPay > 0 && data.vendor && (
          <PayBalance amount={toPay} upiId={data.vendor.upi_id} shopName={data.vendor.shop_name} />
        )}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t("payments.pastBills")}</h2>
          {bills.length === 0 ? (
            <EmptyState icon={ReceiptText} title={t("payments.noBills")} />
          ) : (
            <ul className="flex flex-col divide-y rounded-[1.375rem] bg-card shadow-card">
              {bills.map((b) => (
                <li key={b.id}>
                  <Link href={`/bill/${b.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
                    <span className="font-medium">{shortDate(b.delivery_date, loc, { weekday: "short", day: "numeric", month: "short" })}</span>
                    <span className="font-semibold">{rupees(Number(b.final_total ?? 0))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        {pays.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{t("payments.history")}</h2>
            <ul className="flex flex-col divide-y rounded-[1.375rem] bg-card shadow-card">
              {pays.map((p) => (
                <li key={p.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block font-medium">{shortDate(p.created_at, loc, { day: "numeric", month: "short" })}</span>
                    <span className="text-sm text-muted-foreground">{t(`paymentMethod.${p.method}`)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{rupees(Number(p.amount))}</span>
                    <Badge variant={p.status === "confirmed" ? "success" : "warning"}>
                      {p.status === "confirmed" ? t("payments.statusConfirmed") : t("payments.statusClaimed")}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {bills.length === 0 && (
          <Button asChild variant="outline">
            <Link href="/shop">{t("cart.goShop")}</Link>
          </Button>
        )}
      </div>
    </>
  );
}
