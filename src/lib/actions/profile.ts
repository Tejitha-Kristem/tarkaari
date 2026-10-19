"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { INTENT_COOKIE, INVITE_COOKIE } from "@/lib/cookies";
import { getViewer } from "@/lib/data/viewer";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export async function setLanguage(locale: Locale): Promise<ActionResult> {
  if (locale !== "en" && locale !== "kn") return fail({ message: "invalid_input" });
  const viewer = await getViewer();
  if (!viewer) return ok(null);
  const { error } = await viewer.supabase.from("users").update({ language: locale }).eq("id", viewer.userId);
  return error ? fail(error) : ok(null);
}

export async function setName(name: string): Promise<ActionResult> {
  const clean = name.trim().slice(0, 80);
  if (!clean) return fail({ message: "invalid_input" });
  const viewer = await getViewer();
  if (!viewer) return fail({ message: "not_signed_in" });
  const { error } = await viewer.supabase.from("users").update({ name: clean }).eq("id", viewer.userId);
  return error ? fail(error) : ok(null);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(INVITE_COOKIE);
  (await cookies()).delete(INTENT_COOKIE);
  revalidatePath("/", "layout");
}

export async function sendReport(text: string, orderId?: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail({ message: "not_signed_in" });
  const clean = text.trim().slice(0, 2000);
  if (!clean) return fail({ message: "invalid_input" });
  const about = viewer.household?.vendor_id
    ? (await viewer.supabase.from("vendors").select("user_id").eq("id", viewer.household.vendor_id).maybeSingle()).data?.user_id
    : null;
  const { error } = await viewer.supabase
    .from("reports")
    .insert({ from_user: viewer.userId, about: about ?? null, order_id: orderId ?? null, text: clean });
  return error ? fail(error) : ok(null);
}
