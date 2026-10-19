import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { SubHeader } from "@/components/screen-header";
import type { Locale } from "@/i18n/routing";
import { requireCustomerData } from "@/lib/data/customer";
import { shortDate, windowLabel } from "@/lib/format";
import { CartView } from "./cart-view";

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const data = await requireCustomerData();
  const loc = await getLocale();
  const terms = data.terms;
  return (
    <>
      <SubHeader title={t("cart.title")} back="/shop" />
      <CartView
        items={data.items}
        serviceCharge={Number(data.vendor?.service_charge ?? 0)}
        deliveryText={`${shortDate(data.bookableDate, loc, { weekday: "long", day: "numeric", month: "short" })}${terms ? `, ${windowLabel(terms.windowStart, terms.windowEnd, loc)}` : ""}`}
        paymentText={
          terms
            ? terms.mode === "monthly"
              ? t("cart.monthlyBill", { method: t(`paymentMethod.${terms.method}`) })
              : t("cart.afterDelivery", { method: t(`paymentMethod.${terms.method}`) })
            : ""
        }
        hasOrder={!!data.editableOrder}
        canOrder={data.booking.phase === "open" && !data.household.paused && !data.holiday}
        dateLabel={shortDate(data.bookableDate, loc)}
      />
    </>
  );
}
