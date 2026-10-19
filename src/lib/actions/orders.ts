"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data/viewer";
import { fail, ok, type ActionResult } from "@/lib/errors";
import type { Enums } from "@/types/database";

export async function placeOrder(items: { vendorItemId: string; qty: number }[]): Promise<ActionResult<string | null>> {
  const viewer = await getViewer();
  if (!viewer) return fail({ message: "not_signed_in" });
  const { data, error } = await viewer.supabase.rpc("place_order", {
    p_items: items.filter((i) => i.qty > 0).map((i) => ({ vendor_item_id: i.vendorItemId, qty: i.qty })),
  });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return ok(data);
}

export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail({ message: "not_signed_in" });
  const { error } = await viewer.supabase.rpc("cancel_my_order", { p_order_id: orderId });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return ok(null);
}

export async function claimPayment(amount: number, method: Enums<"payment_method">, orderId?: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail({ message: "not_signed_in" });
  const { error } = await viewer.supabase.rpc("claim_payment", { p_amount: amount, p_method: method, p_order_id: orderId });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return ok(null);
}
