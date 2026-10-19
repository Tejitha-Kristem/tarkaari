"use server";

import { getViewer } from "@/lib/data/viewer";
import { saveVendorItems } from "@/lib/data/vendor-items";
import { fail, ok, type ActionResult } from "@/lib/errors";
import type { Enums } from "@/types/database";

export type SetupApartment = {
  apartmentId: string;
  windowStart: string;
  windowEnd: string;
  mode: Enums<"payment_mode">;
  method: Enums<"payment_method">;
};
export type SetupItem = { catalogueItemId: string; unit: Enums<"item_unit">; min: number; max: number };

const UPI = /^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9]{2,64}$/;

/** Creates (or, if it already exists, updates) the caller's shop with apartments and items. */
export async function createVendorShop(input: {
  ownerName: string;
  shopName: string;
  address: string;
  upiId: string;
  shopPhoto: string | null;
  idPhoto: string | null;
  serviceCharge: number;
  apartments: SetupApartment[];
  items: SetupItem[];
}): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail({ message: "not_signed_in" });
  const { supabase, userId } = viewer;
  if (!input.shopName.trim() || !input.ownerName.trim()) return fail({ message: "invalid_input" });
  if (input.upiId && !UPI.test(input.upiId.trim())) return fail({ message: "invalid_input" });
  if (!input.apartments.length || !input.items.length) return fail({ message: "invalid_input" });
  if (input.items.some((i) => !(i.min > 0) || i.max < i.min)) return fail({ message: "invalid_input" });

  const { error: nameErr } = await supabase.from("users").update({ name: input.ownerName.trim().slice(0, 80) }).eq("id", userId);
  if (nameErr) return fail(nameErr);

  const shop = {
    shop_name: input.shopName.trim().slice(0, 80),
    address: input.address.trim().slice(0, 300) || null,
    upi_id: input.upiId.trim() || null,
    shop_photo: input.shopPhoto,
    id_photo: input.idPhoto,
    service_charge: Math.max(0, Math.min(500, Math.round(input.serviceCharge))),
  };
  let vendorId = viewer.vendor?.id;
  if (vendorId) {
    const { error } = await supabase.from("vendors").update(shop).eq("id", vendorId);
    if (error) return fail(error);
  } else {
    const { data, error } = await supabase.from("vendors").insert({ ...shop, user_id: userId }).select("id").single();
    if (error) return fail(error);
    vendorId = data.id;
  }

  const { error: aptErr } = await supabase.from("vendor_apartments").upsert(
    input.apartments.map((a) => ({
      vendor_id: vendorId!,
      apartment_id: a.apartmentId,
      delivery_window_start: a.windowStart,
      delivery_window_end: a.windowEnd,
      payment_mode: a.mode,
      payment_method: a.method,
      active: true,
    })),
    { onConflict: "vendor_id,apartment_id" },
  );
  if (aptErr) return fail(aptErr);

  const itemErr = await saveVendorItems(supabase, vendorId!, input.items);
  if (itemErr) return fail(itemErr);
  return ok(null);
}
