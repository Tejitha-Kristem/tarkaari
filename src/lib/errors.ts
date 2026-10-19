// Database functions raise short codes (see supabase/migrations/*_operations.sql).
const KNOWN = new Set([
  "not_signed_in", "account_blocked", "not_a_vendor", "vendor_blocked", "vendor_not_active", "not_admin",
  "no_household", "no_vendor", "household_paused", "vendor_unavailable", "booking_closed", "vendor_holiday",
  "order_locked", "item_unavailable", "too_many_items", "order_not_found", "bad_amount", "booking_still_open",
  "order_not_accepted", "items_not_weighed", "order_not_packed", "payment_not_found", "not_your_customer",
  "not_your_apartment", "vendor_not_found", "user_not_found", "cannot_block_self", "same_apartment",
  "apartment_not_found", "vendor_not_serving_apartment", "price_out_of_range", "invalid_input", "invite_invalid",
  "demo_off", "demo_failed", "demo_email_off",
]);

import type en from "../../messages/en.json";

/** Codes with a translated message under `errors.*`. */
export type ErrorCode = keyof (typeof en)["errors"];

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: ErrorCode };

/** Maps a Supabase/Postgres error to a code that has a translated message under `errors.*`. */
export function errorCode(error: { message?: string; hint?: string; code?: string } | null | undefined): ErrorCode {
  if (!error) return "generic";
  if (error.hint && KNOWN.has(error.hint)) return error.hint as ErrorCode;
  if (error.message && KNOWN.has(error.message)) return error.message as ErrorCode;
  if (error.message?.includes("final_price_in_range")) return "price_out_of_range";
  if (error.code === "23514" || error.code === "22P02") return "invalid_input";
  return "generic";
}

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: unknown): ActionResult<never> => ({
  ok: false,
  error: errorCode(error as { message?: string }),
});
