"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data/viewer";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { pushSoon } from "@/lib/notify/soon";
import { saveVendorItems } from "@/lib/data/vendor-items";
import type { Enums, TablesUpdate } from "@/types/database";

async function vendorClient() {
  const viewer = await getViewer();
  if (!viewer?.vendor) return null;
  return { supabase: viewer.supabase, vendorId: viewer.vendor.id };
}

async function run<T>(fn: (c: NonNullable<Awaited<ReturnType<typeof vendorClient>>>) => PromiseLike<{ data: T; error: unknown }>): Promise<ActionResult<T>> {
  const c = await vendorClient();
  if (!c) return fail({ message: "not_a_vendor" });
  const { data, error } = await fn(c);
  if (error) return fail(error as { message: string });
  pushSoon();
  revalidatePath("/", "layout");
  return ok(data);
}

export const acceptOrders = async (date: string) => run((c) => c.supabase.rpc("vendor_accept_orders", { p_delivery_date: date }));

export const setItemAvailable = async (orderItemId: string, available: boolean) =>
  run((c) => c.supabase.rpc("vendor_set_item_available", { p_order_item_id: orderItemId, p_available: available }));

export const packOrder = async (orderId: string, items: { order_item_id: string; qty_actual: number; final_price: number }[]) =>
  run((c) => c.supabase.rpc("vendor_pack_order", { p_order_id: orderId, p_items: items }));

export const markDelivered = async (orderId: string) => run((c) => c.supabase.rpc("vendor_mark_delivered", { p_order_id: orderId }));

export const confirmPayment = async (paymentId: string) => run((c) => c.supabase.rpc("vendor_confirm_payment", { p_payment_id: paymentId }));

export const rejectPayment = async (paymentId: string) => run((c) => c.supabase.rpc("vendor_reject_payment", { p_payment_id: paymentId }));

export const recordCash = async (householdId: string, amount: number) =>
  run((c) => c.supabase.rpc("vendor_record_cash", { p_household_id: householdId, p_amount: amount }));

export const setHouseholdPaused = async (householdId: string, paused: boolean) =>
  run((c) => c.supabase.rpc("vendor_set_household_paused", { p_household_id: householdId, p_paused: paused }));

export const remind = async (householdId: string) => run((c) => c.supabase.rpc("vendor_remind", { p_household_id: householdId }));

export const resetInvite = async (apartmentId: string) => run((c) => c.supabase.rpc("vendor_reset_invite", { p_apartment_id: apartmentId }));

type ItemPatch = Pick<TablesUpdate<"vendor_items">, "available" | "price_min" | "price_max" | "reason_tag" | "listed">;

export async function updateItems(patches: { id: string; patch: ItemPatch }[]): Promise<ActionResult> {
  const c = await vendorClient();
  if (!c) return fail({ message: "not_a_vendor" });
  for (const { id, patch } of patches) {
    if (patch.price_min != null && patch.price_max != null && (patch.price_min <= 0 || patch.price_max < patch.price_min))
      return fail({ message: "invalid_input" });
    const { error } = await c.supabase.from("vendor_items").update(patch).eq("id", id).eq("vendor_id", c.vendorId);
    if (error) return fail(error);
  }
  revalidatePath("/", "layout");
  return ok(null);
}

export async function addItems(items: { catalogueItemId: string; unit: Enums<"item_unit">; min: number; max: number }[]): Promise<ActionResult> {
  const c = await vendorClient();
  if (!c) return fail({ message: "not_a_vendor" });
  if (items.some((i) => i.min <= 0 || i.max < i.min)) return fail({ message: "invalid_input" });
  const error = await saveVendorItems(c.supabase, c.vendorId, items);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return ok(null);
}

type Terms = {
  delivery_window_start: string;
  delivery_window_end: string;
  payment_mode: Enums<"payment_mode">;
  payment_method: Enums<"payment_method">;
  unpaid_limit: number;
};

export async function saveApartmentTerms(apartmentId: string, terms: Terms): Promise<ActionResult> {
  const c = await vendorClient();
  if (!c) return fail({ message: "not_a_vendor" });
  if (terms.delivery_window_end <= terms.delivery_window_start || terms.unpaid_limit < 0) return fail({ message: "invalid_input" });
  const { error } = await c.supabase.from("vendor_apartments").update(terms).eq("vendor_id", c.vendorId).eq("apartment_id", apartmentId);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return ok(null);
}

export async function setApartmentActive(apartmentId: string, active: boolean): Promise<ActionResult> {
  const c = await vendorClient();
  if (!c) return fail({ message: "not_a_vendor" });
  const { error } = await c.supabase.from("vendor_apartments").update({ active }).eq("vendor_id", c.vendorId).eq("apartment_id", apartmentId);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return ok(null);
}

export async function addServedApartment(apartmentId: string): Promise<ActionResult> {
  const c = await vendorClient();
  if (!c) return fail({ message: "not_a_vendor" });
  const { error } = await c.supabase
    .from("vendor_apartments")
    .upsert({ vendor_id: c.vendorId, apartment_id: apartmentId, active: true }, { onConflict: "vendor_id,apartment_id" });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return ok(null);
}

export async function addHoliday(date: string): Promise<ActionResult> {
  const c = await vendorClient();
  if (!c) return fail({ message: "not_a_vendor" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail({ message: "invalid_input" });
  const { error } = await c.supabase.from("vendor_holidays").insert({ vendor_id: c.vendorId, date });
  if (error && !String(error.code).startsWith("23505")) return fail(error);
  revalidatePath("/", "layout");
  return ok(null);
}

export async function removeHoliday(date: string): Promise<ActionResult> {
  const c = await vendorClient();
  if (!c) return fail({ message: "not_a_vendor" });
  const { error } = await c.supabase.from("vendor_holidays").delete().eq("vendor_id", c.vendorId).eq("date", date);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return ok(null);
}

export async function saveShop(patch: { shop_name: string; upi_id: string | null; service_charge: number }): Promise<ActionResult> {
  const c = await vendorClient();
  if (!c) return fail({ message: "not_a_vendor" });
  const name = patch.shop_name.trim();
  if (!name || patch.service_charge < 0 || patch.service_charge > 500) return fail({ message: "invalid_input" });
  const { error } = await c.supabase
    .from("vendors")
    .update({ shop_name: name, upi_id: patch.upi_id?.trim() || null, service_charge: patch.service_charge })
    .eq("id", c.vendorId);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return ok(null);
}
