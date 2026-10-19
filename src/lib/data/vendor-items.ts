import "server-only";
import { defaultStep } from "@/lib/format";
import type { Viewer } from "@/lib/data/viewer";
import type { Enums } from "@/types/database";

export type NewVendorItem = { catalogueItemId: string; unit: Enums<"item_unit">; min: number; max: number };

/**
 * Lists items for sale at the given prices. Rows the vendor had before are
 * updated, new ones inserted. (A PostgREST upsert would also try to rewrite
 * vendor_id, which the column grants rightly forbid.)
 */
export async function saveVendorItems(supabase: Viewer["supabase"], vendorId: string, items: NewVendorItem[]) {
  const { data: existing, error: readErr } = await supabase
    .from("vendor_items")
    .select("id, catalogue_item_id")
    .eq("vendor_id", vendorId)
    .in("catalogue_item_id", items.map((i) => i.catalogueItemId));
  if (readErr) return readErr;
  const have = new Map((existing ?? []).map((e) => [e.catalogue_item_id, e.id]));
  const fields = (i: NewVendorItem) => ({
    unit: i.unit,
    step: defaultStep(i.unit),
    price_min: i.min,
    price_max: i.max,
    listed: true,
    available: true,
  });
  for (const i of items.filter((x) => have.has(x.catalogueItemId))) {
    const { error } = await supabase.from("vendor_items").update(fields(i)).eq("id", have.get(i.catalogueItemId)!);
    if (error) return error;
  }
  const fresh = items.filter((x) => !have.has(x.catalogueItemId));
  if (fresh.length) {
    const { error } = await supabase
      .from("vendor_items")
      .insert(fresh.map((i) => ({ vendor_id: vendorId, catalogue_item_id: i.catalogueItemId, ...fields(i) })));
    if (error) return error;
  }
  return null;
}
