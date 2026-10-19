"use server";

import { cookies } from "next/headers";
import { INTENT_COOKIE, INVITE_COOKIE } from "@/lib/cookies";
import { getViewer } from "@/lib/data/viewer";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

/** Remembers a WhatsApp invite across sign-in. */
export async function rememberInvite(code: string) {
  (await cookies()).set(INVITE_COOKIE, code.slice(0, 40), { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax", httpOnly: true });
  (await cookies()).set(INTENT_COOKIE, "customer", { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
}

export async function readInvite() {
  const code = (await cookies()).get(INVITE_COOKIE)?.value;
  if (!code) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("resolve_invite", { p_code: code });
  return data?.[0] ?? null;
}

export async function addApartment(name: string, area: string): Promise<ActionResult<Tables<"apartments">>> {
  const viewer = await getViewer();
  if (!viewer) return fail({ message: "not_signed_in" });
  const n = name.trim().replace(/\s+/g, " ").slice(0, 120);
  const a = area.trim().replace(/\s+/g, " ").slice(0, 120);
  if (n.length < 2 || a.length < 2) return fail({ message: "invalid_input" });
  const { data, error } = await viewer.supabase
    .from("apartments")
    .insert({ name: n, area: a, created_by: viewer.userId })
    .select()
    .single();
  return error ? fail(error) : ok(data);
}

export async function saveHousehold(input: {
  name?: string;
  apartmentId: string;
  block: string | null;
  flatNo: string;
  vendorId: string | null;
}): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail({ message: "not_signed_in" });
  const flat = input.flatNo.trim().slice(0, 20);
  if (!flat) return fail({ message: "invalid_input" });

  if (input.name?.trim()) {
    const { error } = await viewer.supabase.from("users").update({ name: input.name.trim().slice(0, 80) }).eq("id", viewer.userId);
    if (error) return fail(error);
  }
  const row = { apartment_id: input.apartmentId, block: input.block?.trim() || null, flat_no: flat, vendor_id: input.vendorId };
  const { error } = viewer.household
    ? await viewer.supabase.from("households").update(row).eq("id", viewer.household.id)
    : await viewer.supabase.from("households").insert({ ...row, user_id: viewer.userId });
  if (error) return fail(error);
  (await cookies()).delete(INVITE_COOKIE);
  return ok(null);
}

export async function setVendor(vendorId: string | null): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer?.household) return fail({ message: "no_household" });
  const { error } = await viewer.supabase.from("households").update({ vendor_id: vendorId }).eq("id", viewer.household.id);
  return error ? fail(error) : ok(null);
}
