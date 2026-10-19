import type { Enums } from "@/types/database";

/** A vendor's item as shown in the shop, already in the viewer's language. */
export type ShopItem = {
  vendorItemId: string;
  catalogueItemId: string;
  slug: string;
  name: string;
  altName: string;
  aliases: string[];
  photo: string | null;
  category: Enums<"item_category">;
  unit: Enums<"item_unit">;
  step: number;
  priceMin: number;
  priceMax: number;
  reasonTag: Enums<"reason_tag"> | null;
  available: boolean;
};

export type BookingInfo = {
  phase: "not_open" | "open" | "locked";
  deliveryDate: string;
  closesAt: string | null;
  opensAt: string | null;
  /** Server clock (ms) when the page rendered; the dev stack can pin it. */
  now: number;
};
