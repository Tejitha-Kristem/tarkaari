// Booking-window rules, computed in IST regardless of the server's time zone.
// The database enforces the same rules in public.booking_state(); keep both in sync.

export const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MINUTES = 5 * 60 + 30; // India has no DST, so this is exact.

export const BOOKING_OPENS_AT = { hour: 10, minute: 0 };
export const BOOKING_CLOSES_AT = { hour: 17, minute: 0 };
export const VENDOR_ACCEPT_BY = { hour: 21, minute: 0 };

export type BookingPhase = "not_open" | "open" | "locked";

export type BookingState = {
  phase: BookingPhase;
  /** The delivery date (YYYY-MM-DD, IST) that the current or upcoming window books for. */
  deliveryDate: string;
  /** When the window closes, if it is open now. */
  closesAt: Date | null;
  /** When the next window opens, if it is not open now. */
  opensAt: Date | null;
};

/** Today's date (YYYY-MM-DD) and minutes since midnight, in IST. */
export function istNow(now: Date = new Date()) {
  const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** An instant at the given IST wall-clock time on an IST date. */
export function istInstant(isoDate: string, time: { hour: number; minute: number }): Date {
  const hh = String(time.hour).padStart(2, "0");
  const mm = String(time.minute).padStart(2, "0");
  return new Date(`${isoDate}T${hh}:${mm}:00+05:30`);
}

const toMinutes = (t: { hour: number; minute: number }) => t.hour * 60 + t.minute;

export function bookingState(now: Date = new Date()): BookingState {
  const { date, minutes } = istNow(now);
  const tomorrow = addDays(date, 1);

  if (minutes < toMinutes(BOOKING_OPENS_AT)) {
    return {
      phase: "not_open",
      deliveryDate: tomorrow,
      closesAt: null,
      opensAt: istInstant(date, BOOKING_OPENS_AT),
    };
  }
  if (minutes < toMinutes(BOOKING_CLOSES_AT)) {
    return {
      phase: "open",
      deliveryDate: tomorrow,
      closesAt: istInstant(date, BOOKING_CLOSES_AT),
      opensAt: null,
    };
  }
  return {
    phase: "locked",
    deliveryDate: tomorrow,
    closesAt: null,
    opensAt: istInstant(tomorrow, BOOKING_OPENS_AT),
  };
}

/** Customers may change an order only while the window that books its delivery date is open. */
export function canCustomerEdit(deliveryDate: string, now: Date = new Date()): boolean {
  const state = bookingState(now);
  return state.phase === "open" && state.deliveryDate === deliveryDate;
}

/** The vendor must accept orders by 9 pm IST on the evening before delivery. */
export function vendorAcceptDeadline(deliveryDate: string): Date {
  return istInstant(addDays(deliveryDate, -1), VENDOR_ACCEPT_BY);
}
