import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SubHeader } from "@/components/screen-header";
import type { Locale } from "@/i18n/routing";
import { flatLabel, requireVendorData, getVendorOrders, pickDate } from "@/lib/data/vendor";
import { PackForm } from "./pack-form";

export default async function PackOrderPage({ params, searchParams }: PageProps<"/[locale]/vendor/pack/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireVendorData();
  const { which, date } = pickDate(data, sp.d, "today");
  const order = (await getVendorOrders(date)).find((o) => o.id === id);
  if (!order) notFound();
  const apt = data.apartments.find((a) => a.apartment_id === order.apartment_id);

  return (
    <>
      <SubHeader title={`${flatLabel(order.household)} · ${order.household.user?.name ?? ""}`} back={`/vendor/pack?d=${which}`} />
      <div className="flex flex-col gap-4 px-4 pb-44">
        <p className="text-sm text-muted-foreground">
          {apt?.apartment.name} · {t("vendorPack.detailHint")}
        </p>
        <PackForm
          orderId={order.id}
          status={order.status}
          flat={flatLabel(order.household)}
          serviceCharge={Number(order.service_charge)}
          phone={order.household.user?.phone ?? null}
          items={order.items.map((i) => ({
            id: i.id,
            name: loc === "kn" ? i.catalogue.name_kn : i.catalogue.name_en,
            photo: i.catalogue.photo,
            category: i.catalogue.category,
            unit: i.unit_snapshot,
            ordered: Number(i.qty_ordered),
            actual: i.qty_actual != null ? Number(i.qty_actual) : null,
            price: i.final_price != null ? Number(i.final_price) : null,
            min: Number(i.price_min_snapshot),
            max: Number(i.price_max_snapshot),
            step: Number(i.vendor_item?.step ?? 1),
            available: i.available,
          }))}
        />
      </div>
    </>
  );
}
