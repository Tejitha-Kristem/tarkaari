"use server";

import { getViewer } from "@/lib/data/viewer";
import { fail, ok, type ActionResult } from "@/lib/errors";

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function savePushSubscription(sub: Sub, userAgent: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail({ message: "not_signed_in" });
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return fail({ message: "invalid_input" });
  // The endpoint is unique; drop any old row for it (same phone, previous account) first.
  await viewer.supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await viewer.supabase.from("push_subscriptions").insert({
    user_id: viewer.userId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: userAgent.slice(0, 300),
  });
  return error ? fail(error) : ok(null);
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail({ message: "not_signed_in" });
  const { error } = await viewer.supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return error ? fail(error) : ok(null);
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail({ message: "not_signed_in" });
  const { error } = await viewer.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", viewer.userId)
    .is("read_at", null);
  return error ? fail(error) : ok(null);
}
