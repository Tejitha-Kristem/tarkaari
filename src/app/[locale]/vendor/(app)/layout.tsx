import { setRequestLocale } from "next-intl/server";
import { VendorNav } from "@/components/bottom-nav";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireVendorData } from "@/lib/data/vendor";
import { getViewer, homeFor } from "@/lib/data/viewer";

export default async function VendorLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const viewer = await getViewer();
  if (!viewer) redirect({ href: "/", locale: locale as Locale });
  const home = homeFor(viewer!);
  if (home !== "/vendor") redirect({ href: home, locale: locale as Locale });
  const data = await requireVendorData();
  const { count } = await data.viewer.supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", data.vendor.id)
    .eq("delivery_date", data.nextDate)
    .eq("status", "placed");
  return (
    <>
      <div className="mx-auto min-h-dvh w-full max-w-lg pb-28">{children}</div>
      <VendorNav newOrders={data.booking.phase === "locked" ? (count ?? 0) : 0} />
    </>
  );
}
