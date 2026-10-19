import { setRequestLocale } from "next-intl/server";
import { CustomerShell } from "@/components/customer-shell";
import { requireCustomerData, orderToCart } from "@/lib/data/customer";
import { getViewer, homeFor } from "@/lib/data/viewer";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export default async function CustomerLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const viewer = await getViewer();
  if (!viewer) redirect({ href: "/", locale: locale as Locale });
  const home = homeFor(viewer!);
  if (home !== "/shop") redirect({ href: home, locale: locale as Locale });
  const data = await requireCustomerData();
  return (
    <CustomerShell scope={`${data.household.id}:${data.bookableDate}`} seed={orderToCart(data.editableOrder)}>
      {children}
    </CustomerShell>
  );
}
