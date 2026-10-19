import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getBooking } from "@/lib/data/booking";
import { getViewer, type Viewer } from "@/lib/data/viewer";
import { addDays, istNow } from "@/lib/time";
import type { BookingInfo } from "@/lib/types";
import type { Tables } from "@/types/database";

export type VendorApartment = Tables<"vendor_apartments"> & { apartment: Pick<Tables<"apartments">, "id" | "name" | "area"> };

export type VendorOrder = Tables<"orders"> & {
  household: Pick<Tables<"households">, "id" | "flat_no" | "block" | "apartment_id"> & { user: Pick<Tables<"users">, "name" | "phone"> | null };
  items: (Tables<"order_items"> & {
    catalogue: Pick<Tables<"catalogue_items">, "id" | "name_en" | "name_kn" | "photo" | "category" | "sort_order">;
    vendor_item: Pick<Tables<"vendor_items">, "price_min" | "price_max" | "step"> | null;
  })[];
};

export type VendorData = {
  viewer: Viewer;
  vendor: Tables<"vendors">;
  booking: BookingInfo;
  today: string;
  /** The date customers are ordering for right now (tomorrow). */
  nextDate: string;
  apartments: VendorApartment[];
};

/** Vendor, clock and served apartments, once per request. Null unless an active vendor. */
export const getVendorData = cache(async (): Promise<VendorData | null> => {
  const viewer = await getViewer();
  const vendor = viewer?.vendor;
  if (!viewer || !vendor || vendor.approval_status !== "active") return null;
  const booking = await getBooking(viewer.supabase);
  const today = istNow(new Date(booking.now)).date;
  const { data } = await viewer.supabase
    .from("vendor_apartments")
    .select("*, apartment:apartments(id, name, area)")
    .eq("vendor_id", vendor.id)
    .order("created_at");
  return {
    viewer,
    vendor,
    booking,
    today,
    nextDate: addDays(today, 1),
    apartments: ((data ?? []) as VendorApartment[]).filter((a) => a.apartment),
  };
});

const ORDER_SELECT =
  "*, household:households(id, flat_no, block, apartment_id, user:users(name, phone)), items:order_items(*, catalogue:catalogue_items(id, name_en, name_kn, photo, category, sort_order), vendor_item:vendor_items(price_min, price_max, step))";

/** Live (not cancelled) orders for one delivery date, sorted by apartment, block and flat. */
export const getVendorOrders = cache(async (date: string): Promise<VendorOrder[]> => {
  const data = await getVendorData();
  if (!data) return [];
  const { data: rows } = await data.viewer.supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("vendor_id", data.vendor.id)
    .eq("delivery_date", date)
    .neq("status", "cancelled");
  const orders = (rows ?? []) as unknown as VendorOrder[];
  const aptOrder = new Map(data.apartments.map((a, i) => [a.apartment_id, i]));
  const collator = new Intl.Collator("en", { numeric: true });
  for (const o of orders) o.items.sort((a, b) => a.catalogue.sort_order - b.catalogue.sort_order);
  return orders.sort(
    (a, b) =>
      (aptOrder.get(a.apartment_id) ?? 99) - (aptOrder.get(b.apartment_id) ?? 99) ||
      collator.compare(a.household.block ?? "", b.household.block ?? "") ||
      collator.compare(a.household.flat_no, b.household.flat_no),
  );
});

/** The date a vendor screen shows: ?d=today|next, else the sensible default for the time of day. */
export function pickDate(data: VendorData, d: string | string[] | undefined, fallback: "today" | "next") {
  const which = d === "today" || d === "next" ? d : fallback;
  return { which, date: which === "today" ? data.today : data.nextDate } as const;
}

export const flatLabel = (h: { block: string | null; flat_no: string }) => [h.block, h.flat_no].filter(Boolean).join("-");

/** Total quantity of each item across orders (items marked not available are left out). */
export function aggregate(orders: VendorOrder[], locale: string) {
  const map = new Map<string, { id: string; name: string; alt: string; photo: string | null; category: VendorOrder["items"][number]["catalogue"]["category"]; unit: string; qty: number; houses: number; sort: number }>();
  for (const o of orders)
    for (const i of o.items) {
      if (i.available === false) continue;
      const key = `${i.catalogue_item_id}:${i.unit_snapshot}`;
      const row = map.get(key) ?? {
        id: key,
        name: locale === "kn" ? i.catalogue.name_kn : i.catalogue.name_en,
        alt: locale === "kn" ? i.catalogue.name_en : i.catalogue.name_kn,
        photo: i.catalogue.photo,
        category: i.catalogue.category,
        unit: i.unit_snapshot,
        qty: 0,
        houses: 0,
        sort: i.catalogue.sort_order,
      };
      row.qty += Number(i.qty_ordered);
      row.houses += 1;
      map.set(key, row);
    }
  return [...map.values()].sort((a, b) => a.sort - b.sort);
}

/**
 * For vendor pages. Next renders a page alongside its layout, so the page can't
 * rely on the layout's redirect; anyone else is sent home to be routed.
 */
export async function requireVendorData(): Promise<VendorData> {
  const data = await getVendorData();
  if (!data) redirect("/");
  return data;
}
