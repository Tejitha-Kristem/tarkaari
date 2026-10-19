"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionBar } from "@/components/action-bar";
import { useCustomerCart } from "@/components/customer-shell";
import { SpeechButton } from "@/components/speech-input";
import { Button } from "@/components/ui/button";
import { VegImage } from "@/components/veg-image";
import { useRouter } from "@/i18n/navigation";
import { formatQty } from "@/lib/format";
import { parseShoppingList } from "@/lib/list-parser";
import type { ShopItem } from "@/lib/types";

export function ListToCart({ items, vendorName }: { items: ShopItem[]; vendorName: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { cart, replace } = useCustomerCart();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseShoppingList<ShopItem & { id: string; names: string[] }>> | null>(null);

  const matchable = useMemo(
    () => items.filter((i) => i.available).map((i) => ({ ...i, id: i.vendorItemId, names: i.aliases })),
    [items],
  );
  const found = parsed?.filter((l) => l.item) ?? [];

  function addAll() {
    const next = { ...cart };
    for (const l of found) if (l.item && "qty" in l) next[l.item.vendorItemId] = l.qty;
    replace(next);
    toast(t("list.added", { count: found.length }));
    router.push("/shop");
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-48">
      {!parsed ? (
        <>
          <p className="text-muted-foreground">{t("list.hint")}</p>
          <label className="sr-only" htmlFor="list">{t("list.title")}</label>
          <textarea
            id="list"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={t("list.placeholder")}
            className="rounded-[1.375rem] border-2 border-input bg-card p-4 text-lg outline-none focus:border-primary"
          />
          <SpeechButton onText={(heard) => setText((p) => (p.trim() ? `${p.trim()}, ${heard}` : heard))} />
        </>
      ) : (
        <>
          <p className="font-semibold text-success">{t("list.found", { count: found.length })}</p>
          <ul className="flex flex-col gap-2">
            {parsed.map((l, n) => (
              <li
                key={n}
                className={
                  l.item
                    ? "flex items-center gap-3 rounded-[1.25rem] bg-card p-3 shadow-card"
                    : "flex items-center gap-3 rounded-[1.25rem] border-2 border-dashed border-destructive bg-[#fdf1f1] p-3"
                }
              >
                {l.item ? (
                  <VegImage photo={l.item.photo} category={l.item.category} className="size-12 shrink-0 rounded-xl" />
                ) : (
                  <span className="size-12 shrink-0 rounded-xl bg-muted" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block leading-tight font-semibold">{l.item ? l.item.name : t("list.notUnderstood")}</span>
                  <span className="block truncate text-sm text-muted-foreground">“{l.text}”</span>
                </span>
                {l.item && "qty" in l ? (
                  <>
                    <span className="font-semibold whitespace-nowrap">
                      {formatQty(l.qty)} {t(`units.${l.item.unit}`)}
                    </span>
                    <span role="img" aria-label={t("a11y.available")} className="flex size-7 items-center justify-center rounded-full bg-success text-white">
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                    </span>
                  </>
                ) : (
                  <span role="img" aria-label={t("list.notSold", { vendor: vendorName })} className="flex size-7 items-center justify-center rounded-md bg-destructive text-white">
                    <X className="size-4" strokeWidth={3} aria-hidden />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <ActionBar aboveNav>
        {!parsed ? (
          <Button size="lg" disabled={!text.trim()} onClick={() => setParsed(parseShoppingList(text, matchable))}>
            {t("list.read")}
          </Button>
        ) : (
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button size="lg" variant="outline" onClick={() => setParsed(null)}>
              {t("list.edit")}
            </Button>
            <Button size="lg" disabled={!found.length} onClick={addAll}>
              {t("list.addToCart", { count: found.length })}
            </Button>
          </div>
        )}
      </ActionBar>
    </div>
  );
}
