import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { SubHeader } from "@/components/screen-header";
import type { Locale } from "@/i18n/routing";
import { requireVendorData } from "@/lib/data/vendor";
import { ItemsManager, type CatalogueRow, type MyItem } from "./items-manager";

export default async function VendorItemsPage({ params }: PageProps<"/[locale]/vendor/items">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireVendorData();
  const [{ data: catalogue }, { data: mine }] = await Promise.all([
    data.viewer.supabase.from("catalogue_items").select("id, slug, name_en, name_kn, photo, category, default_unit, aliases, sort_order").eq("active", true).order("sort_order"),
    data.viewer.supabase.from("vendor_items").select("id, catalogue_item_id, unit, step, price_min, price_max, reason_tag, available, listed").eq("vendor_id", data.vendor.id),
  ]);
  const byCat = new Map((mine ?? []).map((m) => [m.catalogue_item_id, m]));
  const rows: CatalogueRow[] = (catalogue ?? []).map((c) => ({
    catalogueItemId: c.id,
    name: loc === "kn" ? c.name_kn : c.name_en,
    alt: loc === "kn" ? c.name_en : c.name_kn,
    names: [c.name_en, c.name_kn, ...(c.aliases ?? [])],
    photo: c.photo,
    category: c.category,
    defaultUnit: c.default_unit,
  }));
  const items: MyItem[] = rows
    .filter((r) => byCat.get(r.catalogueItemId)?.listed)
    .map((r) => {
      const m = byCat.get(r.catalogueItemId)!;
      return { ...r, id: m.id, unit: m.unit, min: Number(m.price_min), max: Number(m.price_max), reason: m.reason_tag, available: m.available };
    });

  return (
    <>
      <SubHeader title={t("vendorItems.title")} back="/vendor/more" />
      <ItemsManager items={items} others={rows.filter((r) => !byCat.get(r.catalogueItemId)?.listed)} />
    </>
  );
}
