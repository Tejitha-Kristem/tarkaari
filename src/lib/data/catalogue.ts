import "server-only";
import type { Viewer } from "@/lib/data/viewer";
import type { Tables } from "@/types/database";

export type CatalogueEntry = Pick<
  Tables<"catalogue_items">,
  "id" | "slug" | "name_en" | "name_kn" | "photo" | "default_unit" | "category" | "aliases" | "sort_order"
>;

export async function getCatalogue(supabase: Viewer["supabase"]): Promise<CatalogueEntry[]> {
  const { data } = await supabase
    .from("catalogue_items")
    .select("id, slug, name_en, name_kn, photo, default_unit, category, aliases, sort_order")
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
}
