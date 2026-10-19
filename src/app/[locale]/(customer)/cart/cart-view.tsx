"use client";

import { CalendarClock, ShoppingBasket, Trash2, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar } from "@/components/action-bar";
import { useCustomerCart } from "@/components/customer-shell";
import { EmptyState } from "@/components/empty-state";
import { QtyStepper } from "@/components/qty-stepper";
import { Button } from "@/components/ui/button";
import { VegImage } from "@/components/veg-image";
import { useUndo } from "@/hooks/use-undo";
import { Link, useRouter } from "@/i18n/navigation";
import { placeOrder } from "@/lib/actions/orders";
import { formatRange, lineRange, perUnitLabel } from "@/lib/format";
import type { ShopItem } from "@/lib/types";

export function CartView({
  items,
  serviceCharge,
  deliveryText,
  paymentText,
  hasOrder,
  canOrder,
  dateLabel,
}: {
  items: ShopItem[];
  serviceCharge: number;
  deliveryText: string;
  paymentText: string;
  hasOrder: boolean;
  canOrder: boolean;
  dateLabel: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const undo = useUndo();
  const { cart, setQty, reset, touched } = useCustomerCart();
  const [busy, setBusy] = useState(false);

  const lines = items
    .filter((i) => cart[i.vendorItemId])
    .map((i) => ({ item: i, qty: cart[i.vendorItemId], ...lineRange(cart[i.vendorItemId], i.unit, i.priceMin, i.priceMax) }));
  const lo = lines.reduce((a, l) => a + l.lo, 0);
  const hi = lines.reduce((a, l) => a + l.hi, 0);

  async function submit() {
    setBusy(true);
    const res = await placeOrder(lines.map((l) => ({ vendorItemId: l.item.vendorItemId, qty: l.qty })));
    setBusy(false);
    if (!res.ok) {
      toast(t(`errors.${res.error}`));
      return;
    }
    toast(hasOrder ? t("cart.updated") : t("cart.placed", { date: dateLabel }));
    reset();
    router.push("/order");
    router.refresh();
  }

  if (!lines.length && !(hasOrder && touched)) {
    return (
      <div className="px-4 pt-4">
        <EmptyState icon={ShoppingBasket} title={t("cart.empty")} body={t("cart.emptyBody")}>
          <Button asChild>
            <Link href="/shop">{t("cart.goShop")}</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-32">
      <ul className="flex flex-col gap-2">
        {lines.map(({ item, qty, lo, hi }) => (
          <li key={item.vendorItemId} className="flex flex-col gap-2.5 rounded-[1.375rem] bg-card p-3 shadow-card">
            <div className="flex items-center gap-3">
              <VegImage photo={item.photo} category={item.category} className="size-14 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="leading-tight font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatRange(item.priceMin, item.priceMax)} / {perUnitLabel(item.unit, t(`units.${item.unit}`), t("units.g"))}
                </p>
              </div>
              <span className="font-semibold">{formatRange(lo, hi)}</span>
            </div>
            <div className="flex items-center gap-2">
              <QtyStepper
                value={qty}
                step={item.step}
                unitLabel={t(`units.${item.unit}`)}
                itemName={item.name}
                max={item.unit === "g" ? 5000 : 50}
                onChange={(v) => setQty(item.vendorItemId, v)}
                className="flex-1"
              />
              <button
                type="button"
                aria-label={t("a11y.removed", { item: item.name })}
                onClick={() => {
                  setQty(item.vendorItemId, 0);
                  undo({ message: t("a11y.removed", { item: item.name }), undo: () => setQty(item.vendorItemId, qty) });
                }}
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-2 rounded-[1.375rem] bg-card p-4 shadow-card">
        <div className="flex justify-between">
          <span>{t("cart.items")}</span>
          <span className="font-semibold">{formatRange(lo, hi)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("cart.service")}</span>
          <span className="font-semibold">₹{serviceCharge}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-lg">
          <span className="font-semibold">{t("cart.total")}</span>
          <span className="font-bold">{formatRange(lo + serviceCharge, hi + serviceCharge)}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t("cart.finalNote")}</p>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-[1.25rem] bg-card p-3 shadow-card">
          <span aria-hidden className="flex size-10 items-center justify-center rounded-2xl bg-mint text-primary">
            <CalendarClock className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">{t("cart.delivery")}</p>
            <p className="font-semibold">{deliveryText}</p>
          </div>
        </div>
        {paymentText && (
          <div className="flex items-center gap-3 rounded-[1.25rem] bg-card p-3 shadow-card">
            <span aria-hidden className="flex size-10 items-center justify-center rounded-2xl bg-peach text-[#7a4a12]">
              <Wallet className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">{t("cart.payment")}</p>
              <p className="font-semibold">{paymentText}</p>
            </div>
          </div>
        )}
      </section>

      <ActionBar aboveNav>
        {!canOrder && <p className="rounded-full bg-card px-4 py-2 text-center text-sm font-semibold shadow-card">{t("cart.closed")}</p>}
        <Button size="lg" className="w-full shadow-raised" loading={busy} disabled={!canOrder} onClick={submit}>
          {hasOrder ? t("cart.update") : t("cart.place")} · {formatRange(lo + serviceCharge, hi + serviceCharge)}
        </Button>
      </ActionBar>
    </div>
  );
}
