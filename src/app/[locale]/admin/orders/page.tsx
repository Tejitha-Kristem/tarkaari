import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/routing";
import { getBooking } from "@/lib/data/booking";
import { requireAdmin } from "@/lib/data/viewer";
import { formatRange, prettyPhone, rupees } from "@/lib/format";

export default async function AdminOrders({ params, searchParams }: PageProps<"/[locale]/admin/orders">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const { supabase } = await requireAdmin();
  const booking = await getBooking(supabase);
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : booking.deliveryDate;
  const phone = typeof sp.phone === "string" ? sp.phone.replace(/\D/g, "") : "";

  let householdIds: string[] | null = null;
  if (phone.length >= 4) {
    const { data: users } = await supabase.from("users").select("id").ilike("phone", `%${phone}%`).limit(20);
    const { data: hs } = await supabase.from("households").select("id").in("user_id", (users ?? []).map((u) => u.id));
    householdIds = (hs ?? []).map((h) => h.id);
  }
  let query = supabase
    .from("orders")
    .select("id, status, est_min, est_max, final_total, household:households(flat_no, block, user:users(name, phone)), apartment:apartments(name), vendor:vendors(shop_name), order_items(count)")
    .eq("delivery_date", date)
    .order("created_at")
    .limit(200);
  if (householdIds) query = query.in("household_id", householdIds.length ? householdIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data } = await query;

  return (
    <div className="flex flex-col gap-3">
      <form className="flex flex-wrap gap-2">
        <input type="date" name="date" defaultValue={date} aria-label={t("admin.date")} className="h-12 rounded-full border border-input bg-card px-4 text-base" />
        <input
          name="phone"
          defaultValue={phone}
          inputMode="tel"
          placeholder={t("admin.searchPhone")}
          className="h-12 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-base"
        />
        <button className="h-12 rounded-full bg-primary px-5 font-semibold text-primary-foreground">{t("admin.lookup")}</button>
      </form>
      {(data ?? []).map((o) => {
        const h = o.household as unknown as { flat_no: string; block: string | null; user: { name: string | null; phone: string } | null };
        return (
          <article key={o.id} className="flex items-center gap-3 rounded-[1.375rem] bg-card p-4 shadow-card">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {[h.block, h.flat_no].filter(Boolean).join("-")} · {o.apartment?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {h.user?.name} · {prettyPhone(h.user?.phone ?? null)} · {o.vendor?.shop_name}
              </p>
              <p className="text-sm">
                {t("common.items", { count: (o.order_items as unknown as { count: number }[])[0]?.count ?? 0 })} ·{" "}
                {o.final_total != null ? rupees(Number(o.final_total)) : formatRange(Number(o.est_min), Number(o.est_max))}
              </p>
            </div>
            <Badge variant={o.status === "cancelled" ? "urgent" : o.status === "delivered" ? "success" : "secondary"}>{t(`orderStatus.${o.status}`)}</Badge>
          </article>
        );
      })}
      {(data ?? []).length === 0 && <p className="text-muted-foreground">{t("admin.noResults")}</p>}
    </div>
  );
}
