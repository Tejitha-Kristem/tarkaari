import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { AdminAction } from "@/components/admin-action";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { setVendorStatus } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/data/viewer";
import { prettyPhone, rupees, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

const STATUSES: Enums<"vendor_approval">[] = ["pending", "active", "paused", "blocked"];
const VARIANT = { pending: "warning", active: "success", paused: "secondary", blocked: "urgent" } as const;

export default async function AdminVendors({ params, searchParams }: PageProps<"/[locale]/admin/vendors">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as Enums<"vendor_approval">) ? (sp.status as Enums<"vendor_approval">) : "pending";
  const t = await getTranslations("admin");
  const loc = await getLocale();
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("vendors")
    .select("*, owner:users(name, phone), served:vendor_apartments(apartment:apartments(name))")
    .eq("approval_status", status)
    .order("created_at", { ascending: false });
  const vendors = await Promise.all(
    (data ?? []).map(async (v) => ({
      ...v,
      shopUrl: v.shop_photo ? supabase.storage.from("shop-photos").getPublicUrl(v.shop_photo).data.publicUrl : null,
      idUrl: v.id_photo ? ((await supabase.storage.from("id-photos").createSignedUrl(v.id_photo, 600)).data?.signedUrl ?? null) : null,
    })),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/vendors?status=${s}`}
            replace
            className={cn("flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold", s === status ? "bg-primary text-primary-foreground" : "bg-card shadow-card")}
          >
            {t(`vendorStatus_${s}`)}
          </Link>
        ))}
      </div>
      {vendors.length === 0 && <p className="text-muted-foreground">{t("noResults")}</p>}
      {vendors.map((v) => (
        <article key={v.id} className="flex flex-col gap-3 rounded-[1.5rem] bg-card p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{v.shop_name}</p>
              <p className="text-sm text-muted-foreground">
                {v.owner?.name} · {prettyPhone(v.owner?.phone ?? null)} · {shortDate(v.created_at, loc, { day: "numeric", month: "short" })}
              </p>
              {v.address && <p className="text-sm">{v.address}</p>}
              <p className="text-sm">
                UPI: {v.upi_id ?? "—"} · {rupees(Number(v.service_charge))}
              </p>
              <p className="text-sm text-muted-foreground">{v.served.map((s) => s.apartment?.name).filter(Boolean).join(", ")}</p>
            </div>
            <Badge variant={VARIANT[v.approval_status]}>{t(`vendorStatus_${v.approval_status}`)}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { url: v.shopUrl, label: t("shopPhoto") },
              { url: v.idUrl, label: t("idPhoto") },
            ].map((p) => (
              <figure key={p.label} className="flex flex-col gap-1">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs */}
                    <img src={p.url} alt={p.label} className="aspect-[4/3] w-full rounded-2xl bg-muted object-cover" />
                  </a>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">{t("noPhoto")}</div>
                )}
                <figcaption className="text-xs text-muted-foreground">{p.label}</figcaption>
              </figure>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {v.approval_status !== "active" && (
              <AdminAction variant="default" run={setVendorStatus.bind(null, v.id, "active")}>
                {v.approval_status === "pending" ? t("approve") : t("activate")}
              </AdminAction>
            )}
            {v.approval_status === "active" && (
              <AdminAction run={setVendorStatus.bind(null, v.id, "paused")} confirm={`${t("pause")}: ${v.shop_name}?`}>
                {t("pause")}
              </AdminAction>
            )}
            {v.approval_status !== "blocked" && (
              <AdminAction variant="outline-danger" run={setVendorStatus.bind(null, v.id, "blocked")} confirm={`${t("block")}: ${v.shop_name}?`}>
                {t("block")}
              </AdminAction>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
