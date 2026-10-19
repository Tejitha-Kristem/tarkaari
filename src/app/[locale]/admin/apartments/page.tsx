import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminAction } from "@/components/admin-action";
import type { Locale } from "@/i18n/routing";
import { removeApartment } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/data/viewer";
import { MergeApartment } from "./merge";

export default async function AdminApartments({ params, searchParams }: PageProps<"/[locale]/admin/apartments">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const t = await getTranslations();
  const { supabase } = await requireAdmin();
  let query = supabase.from("apartments").select("id, name, area, created_at, households(count), vendor_apartments(count)").eq("status", "active").order("name").limit(100);
  if (q) query = query.or(`name.ilike.%${q.replace(/[,()%]/g, "")}%,area.ilike.%${q.replace(/[,()%]/g, "")}%`);
  const { data } = await query;
  const apts = (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    area: a.area,
    households: (a.households as unknown as { count: number }[])[0]?.count ?? 0,
    vendors: (a.vendor_apartments as unknown as { count: number }[])[0]?.count ?? 0,
  }));
  const options = apts.map((a) => ({ id: a.id, label: `${a.name} · ${a.area}` }));

  return (
    <div className="flex flex-col gap-3">
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder={t("onboarding.aptSearch")}
          className="h-12 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <button className="h-12 rounded-full bg-primary px-5 font-semibold text-primary-foreground">{t("common.search")}</button>
      </form>
      {apts.map((a) => (
        <article key={a.id} className="flex flex-col gap-2 rounded-[1.375rem] bg-card p-4 shadow-card">
          <p className="font-semibold">
            {a.name} <span className="font-normal text-muted-foreground">· {a.area}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {t("admin.households")}: {a.households} · {t("admin.vendors")}: {a.vendors}
          </p>
          <div className="flex flex-wrap gap-2">
            <MergeApartment from={{ id: a.id, label: a.name }} options={options.filter((o) => o.id !== a.id)} />
            <AdminAction variant="outline-danger" run={removeApartment.bind(null, a.id)} confirm={`${t("admin.remove")}: ${a.name}?`}>
              {t("admin.remove")}
            </AdminAction>
          </div>
        </article>
      ))}
      {apts.length === 0 && <p className="text-muted-foreground">{t("admin.noResults")}</p>}
    </div>
  );
}
