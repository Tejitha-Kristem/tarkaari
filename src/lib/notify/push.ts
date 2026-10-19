import "server-only";
import { createTranslator } from "next-intl";
import webpush from "web-push";
import en from "../../../messages/en.json";
import kn from "../../../messages/kn.json";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificationHref, notificationText } from "./text";

const messages = { en, kn } as const;

export const pushConfigured = Boolean(
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.SUPABASE_SECRET_KEY,
);

/**
 * Sends web push for in-app notifications that haven't been pushed yet, then
 * stamps sent_at. Safe to call often (after actions and from cron); rows older
 * than a day are skipped so a late run doesn't spam stale alerts.
 * WhatsApp/SMS can be added here later as further channels.
 */
export async function deliverPending(limit = 200): Promise<{ sent: number; skipped: number }> {
  if (!pushConfigured) return { sent: 0, skipped: 0 };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const db = createAdminClient();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: rows } = await db
    .from("notifications")
    .select("id, user_id, type, payload, user:users(language, role)")
    .eq("channel", "in_app")
    .is("sent_at", null)
    .gte("created_at", since)
    .order("created_at")
    .limit(limit);
  if (!rows?.length) return { sent: 0, skipped: 0 };

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const catIds = [...new Set(rows.map((r) => (r.payload as Record<string, string>)?.catalogueItemId).filter(Boolean))];
  const [{ data: subs }, { data: cats }] = await Promise.all([
    db.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds),
    catIds.length ? db.from("catalogue_items").select("id, name_en, name_kn").in("id", catIds) : Promise.resolve({ data: [] }),
  ]);
  const catalogue = new Map((cats ?? []).map((c) => [c.id, c]));
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

  let sent = 0;
  let skipped = 0;
  const dead: string[] = [];
  for (const row of rows) {
    const locale = row.user?.language === "kn" ? "kn" : "en";
    const t = createTranslator({ locale, messages: messages[locale], namespace: "notifications" });
    const body = notificationText(row, (k, v) => t(k as never, v as never), locale, (id) => {
      const c = catalogue.get(id);
      return c ? (locale === "kn" ? c.name_kn : c.name_en) : "";
    });
    const payload = JSON.stringify({
      title: messages[locale].app.name,
      body,
      url: `${site}${notificationHref(row, row.user?.role ?? "customer")}`,
      tag: row.type,
    });
    const mine = (subs ?? []).filter((s) => s.user_id === row.user_id);
    if (!mine.length) skipped++;
    await Promise.all(
      mine.map((s) =>
        webpush
          .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600 })
          .then(() => void sent++)
          .catch((e: { statusCode?: number }) => {
            if (e.statusCode === 404 || e.statusCode === 410) dead.push(s.id);
          }),
      ),
    );
  }
  await db.from("notifications").update({ sent_at: new Date().toISOString() }).in("id", rows.map((r) => r.id));
  if (dead.length) await db.from("push_subscriptions").delete().in("id", dead);
  return { sent, skipped };
}
