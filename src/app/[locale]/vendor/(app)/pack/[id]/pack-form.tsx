"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ActionBar } from "@/components/action-bar";
import { Button } from "@/components/ui/button";
import { VegImage } from "@/components/veg-image";
import { useRouter } from "@/i18n/navigation";
import { markDelivered, packOrder } from "@/lib/actions/vendor";
import { formatQty, rupees, unitBasis } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

type Item = {
  id: string;
  name: string;
  photo: string | null;
  category: Enums<"item_category">;
  unit: Enums<"item_unit">;
  ordered: number;
  actual: number | null;
  price: number | null;
  min: number;
  max: number;
  step: number;
  available: boolean | null;
};

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

export function PackForm({
  orderId,
  status,
  flat,
  serviceCharge,
  items,
}: {
  orderId: string;
  status: Enums<"order_status">;
  flat: string;
  serviceCharge: number;
  phone: string | null;
  items: Item[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const live = items.filter((i) => i.available !== false);
  const missing = items.filter((i) => i.available === false);
  const [vals, setVals] = useState(() =>
    Object.fromEntries(
      live.map((i) => [i.id, { qty: i.actual ?? i.ordered, price: i.price ?? Math.round((i.min + i.max) / 2) }]),
    ),
  );
  const editable = status === "accepted" || status === "packed";
  const unit = (u: string) => t(`units.${u}` as "units.kg");
  const lineTotal = (i: Item) => round((vals[i.id].qty * vals[i.id].price) / unitBasis(i.unit), 2);
  const total = round(live.reduce((a, i) => a + lineTotal(i), 0) + (live.length ? serviceCharge : 0), 2);
  const set = (id: string, patch: Partial<{ qty: number; price: number }>) => setVals((v) => ({ ...v, [id]: { ...v[id], ...patch } }));

  function pack() {
    start(async () => {
      const res = await packOrder(
        orderId,
        live.map((i) => ({ order_item_id: i.id, qty_actual: vals[i.id].qty, final_price: vals[i.id].price })),
      );
      if (!res.ok) return void toast(t(`errors.${res.error}`));
      toast(t("vendorPack.packedToast", { amount: rupees(Number(res.data ?? total)) }));
      router.refresh();
    });
  }
  function deliver() {
    start(async () => {
      const res = await markDelivered(orderId);
      if (!res.ok) return void toast(t(`errors.${res.error}`));
      toast(t("vendorPack.deliveredToast", { flat }));
      router.back();
      router.refresh();
    });
  }

  return (
    <>
      {status === "placed" && <p className="rounded-2xl bg-butter p-3 font-semibold">{t("vendorPack.notAccepted")}</p>}
      <ul className="flex flex-col gap-3">
        {live.map((i) => {
          const v = vals[i.id];
          const mid = Math.round((i.min + i.max) / 2);
          const chips = [...new Set([i.min, mid, i.max])];
          const basis = i.unit === "g" ? `100 ${unit("g")}` : unit(i.unit);
          return (
            <li key={i.id} className="flex flex-col gap-3 rounded-[1.375rem] bg-card p-3 shadow-card">
              <div className="flex items-center gap-3">
                <VegImage photo={i.photo} category={i.category} className="size-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="leading-tight font-semibold">{i.name}</p>
                  <p className="text-sm text-muted-foreground">{t("vendorPack.ordered", { qty: `${formatQty(i.ordered)} ${unit(i.unit)}` })}</p>
                </div>
                <p className="text-lg font-bold">{rupees(lineTotal(i))}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t("vendorPack.weight")} ({unit(i.unit)})
                </span>
                <div className="flex h-12 items-center rounded-full bg-secondary p-1">
                  <button
                    type="button"
                    disabled={!editable}
                    aria-label={t("a11y.decrease", { item: i.name, unit: unit(i.unit) })}
                    onClick={() => set(i.id, { qty: Math.max(0, round(v.qty - i.step)) })}
                    className="flex size-10 items-center justify-center rounded-full bg-card"
                  >
                    <Minus className="size-4" aria-hidden />
                  </button>
                  <input
                    inputMode="decimal"
                    disabled={!editable}
                    aria-label={`${i.name} ${t("vendorPack.weight")}`}
                    value={String(v.qty)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^\d.]/g, ""));
                      if (Number.isFinite(n)) set(i.id, { qty: round(n) });
                    }}
                    className="min-w-0 flex-1 bg-transparent text-center text-lg font-semibold outline-none"
                  />
                  <button
                    type="button"
                    disabled={!editable}
                    aria-label={t("a11y.increase", { item: i.name, unit: unit(i.unit) })}
                    onClick={() => set(i.id, { qty: round(v.qty + i.step) })}
                    className="flex size-10 items-center justify-center rounded-full bg-card"
                  >
                    <Plus className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t("vendorPack.price")} (₹ / {basis})
                </span>
                <div className="flex gap-2" role="radiogroup">
                  {chips.map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={v.price === p}
                      disabled={!editable}
                      onClick={() => set(i.id, { price: p })}
                      className={cn(
                        "flex h-11 flex-1 items-center justify-center rounded-full text-base font-semibold",
                        v.price === p ? "bg-primary text-primary-foreground" : "bg-secondary",
                      )}
                    >
                      ₹{p}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {missing.length > 0 && (
        <p className="rounded-2xl bg-urgent-soft p-3 text-sm font-semibold text-urgent">
          {t("vendorPack.notAvailable", { items: missing.map((m) => m.name).join(", ") })}
        </p>
      )}
      <section className="rounded-[1.375rem] bg-card p-4 shadow-card">
        <div className="flex items-baseline justify-between text-xl">
          <span className="font-semibold">{t("vendorPack.billTotal")}</span>
          <span className="font-bold">{rupees(total)}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t("vendorPack.inclService", { amount: rupees(serviceCharge) })}</p>
      </section>
      {editable && (
        <ActionBar aboveNav>
          {status === "packed" && (
            <Button size="lg" className="w-full shadow-raised" loading={pending} onClick={deliver}>
              {t("vendorPack.markDelivered")}
            </Button>
          )}
          <Button size={status === "packed" ? "default" : "lg"} variant={status === "packed" ? "outline" : "default"} className="w-full" loading={pending} onClick={pack}>
            {status === "packed" ? t("common.save") : t("vendorPack.markPacked")}
          </Button>
        </ActionBar>
      )}
      {status === "delivered" && <p className="rounded-2xl bg-mint p-3 text-center font-semibold">{t("vendorPack.deliveredDone")}</p>}
    </>
  );
}
