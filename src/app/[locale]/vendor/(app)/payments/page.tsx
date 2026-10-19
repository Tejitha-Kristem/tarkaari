import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitch } from "@/components/language-switch";
import { GreenHeader } from "@/components/screen-header";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { flatLabel, requireVendorData } from "@/lib/data/vendor";
import { rupees, shortDate } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import { DuesBoard, type Due } from "./dues-board";

export default async function VendorPaymentsPage({ params }: PageProps<"/[locale]/vendor/payments">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireVendorData();
  const { data: rows } = await data.viewer.supabase.rpc("vendor_dues");
  const limits = new Map(data.apartments.map((a) => [a.apartment_id, Number(a.unpaid_limit)]));
  const aptName = new Map(data.apartments.map((a) => [a.apartment_id, a.apartment.name]));
  const dues: Due[] = (rows ?? [])
    .filter((r) => Number(r.balance) > 0 || r.pending_payment_id || r.paused)
    .sort((a, b) => Number(!!b.pending_payment_id) - Number(!!a.pending_payment_id) || Number(b.balance) - Number(a.balance))
    .map((r) => ({
      householdId: r.household_id,
      flat: flatLabel({ block: r.block, flat_no: r.flat_no }),
      apartment: aptName.get(r.apartment_id) ?? "",
      name: r.name ?? "",
      phone: r.phone,
      balance: Number(r.balance),
      since: r.oldest_unpaid ? shortDate(r.oldest_unpaid, loc, { day: "numeric", month: "short" }) : null,
      overLimit: Number(r.balance) > (limits.get(r.apartment_id) ?? Infinity),
      paused: r.paused,
      pending: r.pending_payment_id ? { id: r.pending_payment_id, amount: Number(r.pending_amount), method: r.pending_method! } : null,
    }));
  const total = dues.reduce((a, d) => a + d.balance, 0);
  const owing = dues.filter((d) => d.balance > 0).length;

  return (
    <>
      <GreenHeader>
        <div className="flex items-center gap-3">
          <Link href="/vendor/more" aria-label={t("common.back")} className="flex size-11 items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <h1 className="flex-1 text-xl font-semibold">{t("vendorPay.title")}</h1>
          <LanguageSwitch onDark />
        </div>
        <div>
          <p className="text-sm text-on-dark-muted">{t("vendorPay.toCollect")}</p>
          <p className="text-4xl font-bold">{rupees(total)}</p>
          <p className="text-sm text-on-dark-muted">{t("vendorPay.households", { count: owing })}</p>
        </div>
      </GreenHeader>
      <DuesBoard dues={dues} shop={data.vendor.shop_name} upiId={data.vendor.upi_id} />
    </>
  );
}
