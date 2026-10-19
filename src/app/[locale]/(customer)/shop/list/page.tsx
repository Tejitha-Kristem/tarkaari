import { getTranslations, setRequestLocale } from "next-intl/server";
import { SubHeader } from "@/components/screen-header";
import type { Locale } from "@/i18n/routing";
import { requireCustomerData } from "@/lib/data/customer";
import { ListToCart } from "./list-to-cart";

export default async function ListPage({ params }: PageProps<"/[locale]/shop/list">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("list");
  const data = await requireCustomerData();
  return (
    <>
      <SubHeader title={t("title")} back="/shop" />
      <ListToCart items={data.items} vendorName={data.vendor?.shop_name ?? ""} />
    </>
  );
}
