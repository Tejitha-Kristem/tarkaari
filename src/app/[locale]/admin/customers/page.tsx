import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminAction } from "@/components/admin-action";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/routing";
import { setUserStatus } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/data/viewer";
import { prettyPhone } from "@/lib/format";

export default async function AdminCustomers({ params, searchParams }: PageProps<"/[locale]/admin/customers">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[,()%]/g, "") : "";
  const t = await getTranslations();
  const viewer = await requireAdmin();
  let query = viewer.supabase
    .from("users")
    .select("id, name, phone, role, status, households(flat_no, block, apartment:apartments(name))")
    .neq("role", "admin")
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) {
    const digits = q.replace(/\D/g, "");
    query = digits.length >= 4 ? query.ilike("phone", `%${digits}%`) : query.ilike("name", `%${q}%`);
  }
  const { data } = await query;

  return (
    <div className="flex flex-col gap-3">
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder={`${t("admin.searchPhone")} / ${t("admin.searchName")}`}
          className="h-12 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <button className="h-12 rounded-full bg-primary px-5 font-semibold text-primary-foreground">{t("common.search")}</button>
      </form>
      {(data ?? []).map((u) => {
        const h = (u.households as unknown as { flat_no: string; block: string | null; apartment: { name: string } | null }[])[0];
        return (
          <article key={u.id} className="flex items-center gap-3 rounded-[1.375rem] bg-card p-4 shadow-card">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {u.name ?? "—"} <span className="font-normal text-muted-foreground">· {prettyPhone(u.phone)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {u.role === "vendor" ? t("admin.vendors") : h ? `${[h.block, h.flat_no].filter(Boolean).join("-")} · ${h.apartment?.name ?? ""}` : "—"}
              </p>
            </div>
            {u.status === "blocked" ? (
              <>
                <Badge variant="urgent">{t("admin.blocked")}</Badge>
                <AdminAction run={setUserStatus.bind(null, u.id, "active")}>{t("admin.unblock")}</AdminAction>
              </>
            ) : (
              <AdminAction variant="outline-danger" run={setUserStatus.bind(null, u.id, "blocked")} confirm={`${t("admin.block")}: ${u.name ?? u.phone}?`}>
                {t("admin.block")}
              </AdminAction>
            )}
          </article>
        );
      })}
      {(data ?? []).length === 0 && <p className="text-muted-foreground">{t("admin.noResults")}</p>}
    </div>
  );
}
