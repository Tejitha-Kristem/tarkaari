import { rupees, shortDate } from "@/lib/format";
import type { Enums, Json } from "@/types/database";

type T = (key: string, values?: Record<string, string | number>) => string;

export type NotificationRow = { type: Enums<"notification_type">; payload: Json };

/** Text of a notification in the reader's language. `itemName` resolves catalogue ids. */
export function notificationText(n: NotificationRow, t: T, locale: string, itemName: (id: string) => string = () => "") {
  const p = (n.payload ?? {}) as Record<string, string | number | null>;
  const date = p.deliveryDate ? shortDate(String(p.deliveryDate), locale, { weekday: "long", day: "numeric", month: "short" }) : "";
  const amount = p.amount != null ? rupees(Number(p.amount)) : "";
  return t(n.type, { date, amount, count: Number(p.count ?? 0), item: p.catalogueItemId ? itemName(String(p.catalogueItemId)) : "" });
}

/** Where tapping the notification goes. */
export function notificationHref(n: NotificationRow, role: Enums<"user_role">) {
  const p = (n.payload ?? {}) as Record<string, string | null>;
  switch (n.type) {
    case "order_delivered":
      return p.orderId ? `/bill/${p.orderId}` : "/order";
    case "order_accepted":
    case "item_unavailable":
      return "/order";
    case "payment_due":
    case "payment_confirmed":
    case "monthly_statement":
    case "manual_reminder":
      return "/payments";
    case "vendor_approved":
      return "/vendor";
    case "accept_reminder":
      return "/vendor/orders?d=next";
    case "booking_reminder":
      return role === "vendor" ? "/vendor" : "/shop";
    default:
      return "/";
  }
}
