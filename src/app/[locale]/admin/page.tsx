import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBooking } from "@/lib/data/booking";
import { requireAdmin } from "@/lib/data/viewer";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function AdminDashboard({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("admin");
  const loc = await getLocale();
  const { supabase } = await requireAdmin();
  const booking = await getBooking(supabase);
  const head = { count: "exact", head: true } as const;
  const [pending, active, apts, households, orders, reports] = await Promise.all([
    supabase.from("vendors").select("id", head).eq("approval_status", "pending"),
    supabase.from("vendors").select("id", head).eq("approval_status", "active"),
    supabase.from("apartments").select("id", head).eq("status", "active"),
    supabase.from("households").select("id", head),
    supabase.from("orders").select("id", head).eq("delivery_date", booking.deliveryDate).neq("status", "cancelled"),
    supabase.from("reports").select("id", head).eq("status", "open"),
  ]);
  const cards = [
    { label: t("pendingVendors"), value: pending.count, href: "/admin/vendors?status=pending", tint: "bg-butter", urgent: !!pending.count },
    { label: t("activeVendors"), value: active.count, href: "/admin/vendors?status=active", tint: "bg-mint" },
    { label: t("apartments"), value: apts.count, href: "/admin/apartments", tint: "bg-lilac" },
    { label: t("households"), value: households.count, href: "/admin/customers", tint: "bg-peach" },
    {
      label: t("ordersTomorrow", { date: shortDate(booking.deliveryDate, loc, { day: "numeric", month: "short" }) }),
      value: orders.count,
      href: `/admin/orders?date=${booking.deliveryDate}`,
      tint: "bg-mint",
    },
    { label: t("openReports"), value: reports.count, href: "/admin/reports", tint: "bg-blush", urgent: !!reports.count },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <Link key={c.href} href={c.href} className={cn("flex flex-col gap-1 rounded-[1.375rem] p-4 shadow-card", c.tint)}>
          <span className={cn("text-3xl font-bold", c.urgent && "text-urgent")}>{c.value ?? 0}</span>
          <span className="text-sm font-semibold">{c.label}</span>
        </Link>
      ))}
    </div>
  );
}
