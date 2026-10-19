import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { AdminAction } from "@/components/admin-action";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { setReportStatus } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/data/viewer";
import { prettyPhone, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

const STATUSES: Enums<"report_status">[] = ["open", "resolved", "dismissed"];

export default async function AdminReports({ params, searchParams }: PageProps<"/[locale]/admin/reports">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as Enums<"report_status">) ? (sp.status as Enums<"report_status">) : "open";
  const t = await getTranslations("admin");
  const loc = await getLocale();
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("reports")
    .select("id, text, status, created_at, order_id, from:users!reports_from_user_fkey(name, phone), about:users!reports_about_fkey(name, phone)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            replace
            href={`/admin/reports?status=${s}`}
            className={cn("flex h-10 items-center rounded-full px-4 text-sm font-semibold", s === status ? "bg-primary text-primary-foreground" : "bg-card shadow-card")}
          >
            {s === "open" ? t("openReports") : s === "resolved" ? t("resolve") : t("dismiss")}
          </Link>
        ))}
      </div>
      {(data ?? []).map((r) => (
        <article key={r.id} className="flex flex-col gap-2 rounded-[1.375rem] bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">
            {t("fromLabel")}: {r.from?.name} · {prettyPhone(r.from?.phone ?? null)} · {shortDate(r.created_at, loc, { day: "numeric", month: "short" })}
            {r.about && ` · ${t("about")}: ${r.about.name ?? ""} ${prettyPhone(r.about.phone)}`}
          </p>
          <p className="whitespace-pre-wrap">{r.text}</p>
          <div className="flex gap-2">
            {r.status === "open" ? (
              <>
                <AdminAction variant="default" run={setReportStatus.bind(null, r.id, "resolved")}>
                  {t("resolve")}
                </AdminAction>
                <AdminAction run={setReportStatus.bind(null, r.id, "dismissed")}>{t("dismiss")}</AdminAction>
              </>
            ) : (
              <AdminAction run={setReportStatus.bind(null, r.id, "open")}>{t("reopen")}</AdminAction>
            )}
          </div>
        </article>
      ))}
      {(data ?? []).length === 0 && <p className="text-muted-foreground">{t("noResults")}</p>}
    </div>
  );
}
