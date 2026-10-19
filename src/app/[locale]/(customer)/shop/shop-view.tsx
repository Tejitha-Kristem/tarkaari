"use client";

import { LayoutGrid, Mic, RotateCcw, Search, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionBar } from "@/components/action-bar";
import { useCustomerCart } from "@/components/customer-shell";
import { ProductTile } from "@/components/product-tile";
import { VegImage } from "@/components/veg-image";
import { Link } from "@/i18n/navigation";
import { formatRange, lineRange } from "@/lib/format";
import type { ShopItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

const CATEGORY_ORDER: Enums<"item_category">[] = ["daily", "vegetables", "leafy", "roots", "other"];

export function ShopView({
  items,
  repeatable,
  repeatPhotos,
  disabled,
}: {
  items: ShopItem[];
  repeatable: Record<string, number>;
  repeatPhotos: string[];
  locale: string;
  disabled: boolean;
}) {
  const t = useTranslations();
  const { cart, count, setQty, replace } = useCustomerCart();
  const [cat, setCat] = useState<Enums<"item_category"> | "all">("all");
  const [q, setQ] = useState("");

  const cats = useMemo(
    () =>
      CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c)).map((c) => ({
        id: c,
        photo: items.find((i) => i.category === c && i.photo && /\.(webp|jpe?g|png)$/.test(i.photo))?.photo ?? null,
      })),
    [items],
  );

  const query = q.trim().toLowerCase();
  const shown = items.filter(
    (i) => (cat === "all" || i.category === cat) && (!query || i.aliases.some((a) => a.toLowerCase().includes(query))),
  );

  const est = Object.entries(cart).reduce(
    (acc, [id, qty]) => {
      const it = items.find((i) => i.vendorItemId === id);
      if (!it) return acc;
      const r = lineRange(qty, it.unit, it.priceMin, it.priceMax);
      return { lo: acc.lo + r.lo, hi: acc.hi + r.hi };
    },
    { lo: 0, hi: 0 },
  );
  const repeatCount = Object.keys(repeatable).length;
  const repeatEst = Object.entries(repeatable).reduce((a, [id, qty]) => {
    const it = items.find((i) => i.vendorItemId === id);
    return it ? a + lineRange(qty, it.unit, it.priceMin, it.priceMax).hi : a;
  }, 0);

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-40">
      <label className="flex h-13 items-center gap-2.5 rounded-full bg-card py-1 pr-1 pl-4 shadow-card focus-within:ring-2 focus-within:ring-primary">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">{t("common.search")}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("shop.searchOrSay")}
          className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground"
        />
        <Link href="/shop/list" aria-label={t("shop.list")} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Mic className="size-5" aria-hidden />
        </Link>
      </label>

      {!query && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!repeatCount || disabled}
            onClick={() => {
              replace({ ...cart, ...repeatable });
              toast(t("shop.repeated"));
            }}
            className="flex min-h-28 flex-col items-start gap-2 rounded-[1.375rem] bg-peach p-3.5 text-left disabled:opacity-50"
          >
            <span className="flex">
              {repeatPhotos.length ? (
                repeatPhotos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- small catalogue thumbnails
                  <img key={p} src={p} alt="" className={cn("size-9 rounded-full border-2 border-peach object-cover", i && "-ml-2.5")} />
                ))
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full bg-card">
                  <RotateCcw className="size-4" aria-hidden />
                </span>
              )}
            </span>
            <span className="text-base leading-tight font-semibold">{t("shop.repeat")}</span>
            {repeatCount > 0 && (
              <span className="-mt-1 text-xs text-[#6b4a1f]">{t("shop.repeatSub", { count: repeatCount, amount: formatRange(repeatEst, repeatEst) })}</span>
            )}
          </button>
          <Link href="/shop/list" className="flex min-h-28 flex-col items-start gap-2 rounded-[1.375rem] bg-mint p-3.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-accent">
              <Mic className="size-4" aria-hidden />
            </span>
            <span className="text-base leading-tight font-semibold">{t("shop.list")}</span>
            <span className="-mt-1 text-xs text-[#2f5a48]">{t("shop.listSub")}</span>
          </Link>
        </div>
      )}

      {!query && cats.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("shop.byCategory")}</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {[{ id: "all" as const, photo: null }, ...cats].map((c) => {
              const on = cat === c.id;
              return (
                <button key={c.id} type="button" aria-pressed={on} onClick={() => setCat(c.id)} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                  <span className={cn("flex size-[60px] items-center justify-center overflow-hidden rounded-full", on && "ring-[3px] ring-primary ring-offset-2 ring-offset-background")}>
                    {c.id === "all" ? (
                      <span className="flex size-full items-center justify-center bg-primary text-accent">
                        <LayoutGrid className="size-6" aria-hidden />
                      </span>
                    ) : (
                      <VegImage photo={c.photo} category={c.id} className="size-full" />
                    )}
                  </span>
                  <span className={cn("text-center text-xs leading-tight", on ? "font-semibold text-primary" : "text-[#3d4d47]")}>
                    {c.id === "all" ? t("shop.all") : t(`categories.${c.id}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("shop.todays")}</h2>
        {shown.length === 0 ? (
          <p className="text-muted-foreground">{query ? t("shop.noResults", { q }) : t("shop.noItems")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {shown.map((item) => (
              <ProductTile
                key={item.vendorItemId}
                item={item}
                qty={cart[item.vendorItemId] ?? 0}
                onQtyChange={(v) => setQty(item.vendorItemId, v)}
                disabled={disabled || !item.available}
              />
            ))}
          </div>
        )}
      </section>

      {count > 0 && (
        <ActionBar aboveNav>
          <Link href="/cart" className="flex h-15 items-center justify-between rounded-full bg-accent py-1.5 pr-1.5 pl-5 text-accent-foreground shadow-raised">
            <span className="text-sm leading-tight font-semibold">
              {t("shop.cartSummary", { count, amount: formatRange(est.lo, est.hi) })}
            </span>
            <span className="flex h-12 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-primary-foreground">
              <ShoppingCart className="size-5" aria-hidden />
              {t("shop.viewCart")}
            </span>
          </Link>
        </ActionBar>
      )}
    </div>
  );
}
