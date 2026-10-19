import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { SubHeader } from "@/components/screen-header";
import type { Locale } from "@/i18n/routing";
import { requireVendorData } from "@/lib/data/vendor";
import { shortDate } from "@/lib/format";
import { joinLink } from "@/lib/site";
import { ApartmentCard, AddApartment, Holidays } from "./apartment-cards";

export default async function VendorApartmentsPage({ params }: PageProps<"/[locale]/vendor/apartments">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireVendorData();
  const { supabase } = data.viewer;
  const [{ data: households }, { data: holidays }] = await Promise.all([
    supabase.from("households").select("apartment_id").eq("vendor_id", data.vendor.id),
    supabase.from("vendor_holidays").select("date").eq("vendor_id", data.vendor.id).gte("date", data.today).order("date"),
  ]);
  const counts = new Map<string, number>();
  for (const h of households ?? []) counts.set(h.apartment_id, (counts.get(h.apartment_id) ?? 0) + 1);

  return (
    <>
      <SubHeader title={t("vendorApts.title")} back="/vendor/more" />
      <div className="flex flex-col gap-4 px-4 pb-10">
        {data.apartments.map((a) => (
          <ApartmentCard
            key={a.apartment_id}
            apartmentId={a.apartment_id}
            name={a.apartment.name}
            area={a.apartment.area}
            active={a.active}
            households={counts.get(a.apartment_id) ?? 0}
            link={a.invite_code ? joinLink(a.invite_code) : null}
            shareText={
              a.invite_code
                ? t("vendorApts.shareText", { shop: data.vendor.shop_name, apartment: a.apartment.name, link: joinLink(a.invite_code) })
                : ""
            }
            terms={{
              delivery_window_start: a.delivery_window_start.slice(0, 5),
              delivery_window_end: a.delivery_window_end.slice(0, 5),
              payment_mode: a.payment_mode,
              payment_method: a.payment_method,
              unpaid_limit: Number(a.unpaid_limit),
            }}
          />
        ))}
        <AddApartment />
        <Holidays
          min={data.nextDate}
          dates={(holidays ?? []).map((h) => ({ date: h.date, label: shortDate(h.date, loc, { weekday: "long", day: "numeric", month: "long" }) }))}
        />
      </div>
    </>
  );
}
