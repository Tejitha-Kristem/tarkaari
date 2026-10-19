import "server-only";
import type { Viewer } from "@/lib/data/viewer";
import type { BookingInfo } from "@/lib/types";

/** Booking window and the database clock (which the dev stack can pin). */
export async function getBooking(supabase: Viewer["supabase"]): Promise<BookingInfo> {
  const [{ data: rows }, { data: now }] = await Promise.all([
    supabase.rpc("booking_state"),
    supabase.rpc("app_now"),
  ]);
  const b = rows?.[0];
  if (!b) throw new Error("booking_state unavailable");
  return {
    phase: b.phase as BookingInfo["phase"],
    deliveryDate: b.delivery_date,
    closesAt: b.closes_at,
    opensAt: b.opens_at,
    now: new Date(now ?? Date.now()).getTime(),
  };
}
