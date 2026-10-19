import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { getBooking } from "@/lib/data/booking";
import { getViewer, type Viewer } from "@/lib/data/viewer";
import { addDays, istNow } from "@/lib/time";
import type { BookingInfo, ShopItem } from "@/lib/types";
import type { Enums, Tables } from "@/types/database";

export type OrderWithItems = Tables<"orders"> & {
  items: (Tables<"order_items"> & { catalogue: Pick<Tables<"catalogue_items">, "name_en" | "name_kn" | "photo" | "category"> })[];
};

export type CustomerData = {
  viewer: Viewer;
  household: NonNullable<Viewer["household"]>;
  vendor: Pick<Tables<"vendors">, "id" | "shop_name" | "upi_id" | "service_charge" | "approval_status" | "user_id"> | null;
  vendorPhone: string | null;
  terms: { windowStart: string; windowEnd: string; mode: Enums<"payment_mode">; method: Enums<"payment_method"> } | null;
  booking: BookingInfo;
  /** The delivery date a new or edited order goes to right now. */
  bookableDate: string;
  holiday: boolean;
  items: ShopItem[];
  /** Order for bookableDate that can still be edited (status placed), if any. */
  editableOrder: OrderWithItems | null;
  /** Orders from today onwards that aren't cancelled. */
  upcoming: OrderWithItems[];
  lastOrder: OrderWithItems | null;
};

const ORDER_SELECT = "*, items:order_items(*, catalogue:catalogue_items(name_en, name_kn, photo, category))";

/** Everything the customer screens need, once per request. Null when not a customer with a household. */
export const getCustomerData = cache(async (): Promise<CustomerData | null> => {
  const viewer = await getViewer();
  if (!viewer?.household) return null;
  const { supabase, household } = viewer;
  const locale = await getLocale();
  const booking = await getBooking(supabase);
  const bookableDate = booking.phase === "locked" ? addDays(booking.deliveryDate, 1) : booking.deliveryDate;
  const today = istNow(new Date(booking.now)).date;

  const vendorId = household.vendor_id;
  const [vendorRes, termsRes, itemsRes, holidayRes, ordersRes, lastRes] = await Promise.all([
    vendorId
      ? supabase.from("vendors").select("id, shop_name, upi_id, service_charge, approval_status, user_id").eq("id", vendorId).maybeSingle()
      : Promise.resolve({ data: null }),
    vendorId
      ? supabase
          .from("vendor_apartments")
          .select("delivery_window_start, delivery_window_end, payment_mode, payment_method")
          .eq("vendor_id", vendorId)
          .eq("apartment_id", household.apartment_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    vendorId
      ? supabase
          .from("vendor_items")
          .select("id, unit, step, price_min, price_max, reason_tag, available, catalogue:catalogue_items(id, slug, name_en, name_kn, photo, category, aliases, sort_order)")
          .eq("vendor_id", vendorId)
          .eq("listed", true)
      : Promise.resolve({ data: [] }),
    vendorId
      ? supabase.from("vendor_holidays").select("date").eq("vendor_id", vendorId).eq("date", bookableDate).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("orders").select(ORDER_SELECT).eq("household_id", household.id).gte("delivery_date", today).neq("status", "cancelled").order("delivery_date"),
    supabase.from("orders").select(ORDER_SELECT).eq("household_id", household.id).neq("status", "cancelled").order("delivery_date", { ascending: false }).limit(1),
  ]);

  const vendor = vendorRes.data;
  let vendorPhone: string | null = null;
  if (vendor) {
    const { data } = await supabase.from("users").select("phone").eq("id", vendor.user_id).maybeSingle();
    vendorPhone = data?.phone ?? null;
  }

  const items: ShopItem[] = (itemsRes.data ?? [])
    .filter((vi) => vi.catalogue)
    .sort((a, b) => a.catalogue!.sort_order - b.catalogue!.sort_order)
    .map((vi) => {
      const c = vi.catalogue!;
      return {
        vendorItemId: vi.id,
        catalogueItemId: c.id,
        slug: c.slug,
        name: locale === "kn" ? c.name_kn : c.name_en,
        altName: locale === "kn" ? c.name_en : c.name_kn,
        aliases: [c.name_en, c.name_kn, ...c.aliases],
        photo: c.photo,
        category: c.category,
        unit: vi.unit,
        step: Number(vi.step),
        priceMin: Number(vi.price_min),
        priceMax: Number(vi.price_max),
        reasonTag: vi.reason_tag,
        available: vi.available,
      };
    });

  const upcoming = (ordersRes.data ?? []) as OrderWithItems[];
  const t = termsRes.data;
  return {
    viewer,
    household,
    vendor,
    vendorPhone,
    terms: t
      ? {
          windowStart: t.delivery_window_start,
          windowEnd: t.delivery_window_end,
          mode: household.payment_mode_override ?? t.payment_mode,
          method: household.payment_method_override ?? t.payment_method,
        }
      : null,
    booking,
    bookableDate,
    holiday: !!holidayRes.data,
    items,
    editableOrder: upcoming.find((o) => o.delivery_date === bookableDate && o.status === "placed") ?? null,
    upcoming,
    lastOrder: ((lastRes.data ?? [])[0] as OrderWithItems | undefined) ?? null,
  };
});

/** Cart seed from an order: vendorItemId → qty. */
export function orderToCart(order: OrderWithItems | null): Record<string, number> {
  if (!order) return {};
  return Object.fromEntries(order.items.map((i) => [i.vendor_item_id, Number(i.qty_ordered)]));
}

/** For customer pages: see requireVendorData for why pages guard themselves. */
export async function requireCustomerData(): Promise<CustomerData> {
  const data = await getCustomerData();
  if (!data) redirect("/");
  return data;
}
