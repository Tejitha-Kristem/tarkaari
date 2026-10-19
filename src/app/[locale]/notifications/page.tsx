import { BellOff } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { MarkRead } from "@/components/mark-read";
import { SubHeader } from "@/components/screen-header";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getViewer } from "@/lib/data/viewer";
import { notificationHref, notificationText } from "@/lib/notify/text";
import { cn } from "@/lib/utils";

export default async function NotificationsPage({ params }: PageProps<"/[locale]/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("notifications");
  const loc = await getLocale();
  const viewer = await getViewer();
  if (!viewer) redirect({ href: "/", locale: locale as Locale });
  const role = viewer!.profile.role;
  const { data } = await viewer!.supabase
    .from("notifications")
    .select("id, type, payload, created_at, read_at")
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => (r.payload as Record<string, string>)?.catalogueItemId).filter(Boolean))];
  const { data: cats } = ids.length
    ? await viewer!.supabase.from("catalogue_items").select("id, name_en, name_kn").in("id", ids)
    : { data: [] };
  const names = new Map((cats ?? []).map((c) => [c.id, loc === "kn" ? c.name_kn : c.name_en]));
  const when = new Intl.DateTimeFormat(loc === "kn" ? "kn-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      <SubHeader title={t("title")} back={role === "vendor" ? "/vendor/more" : role === "admin" ? "/admin" : "/profile"} />
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-4 pb-10">
        {rows.length === 0 ? (
          <EmptyState icon={BellOff} title={t("empty")} />
        ) : (
          <ul className="flex flex-col divide-y rounded-[1.375rem] bg-card shadow-card">
            {rows.map((n) => (
              <li key={n.id}>
                <Link href={notificationHref(n, role)} className="flex gap-3 px-4 py-3">
                  <span aria-hidden className={cn("mt-2 size-2.5 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-urgent")} />
                  <span className="flex-1">
                    <span className={cn("block leading-snug", !n.read_at && "font-semibold")}>
                      {notificationText(n, (k, v) => t(k as never, v as never), loc, (id) => names.get(id) ?? "")}
                    </span>
                    <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {when.format(new Date(n.created_at))}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {rows.some((r) => !r.read_at) && <MarkRead />}
      </div>
    </>
  );
}
