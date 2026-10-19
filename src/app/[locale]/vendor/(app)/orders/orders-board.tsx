"use client";

import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { ActionBar } from "@/components/action-bar";
import { StatusMark } from "@/components/status-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { acceptOrders, setItemAvailable } from "@/lib/actions/vendor";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

type Item = { id: string; name: string; qty: string; available: boolean | null };
type Order = { id: string; flat: string; customer: string; status: Enums<"order_status">; estimate: string; items: Item[] };
type Group = { id: string; name: string; orders: Order[] };

const badge: Record<string, "warning" | "info" | "success" | "secondary"> = {
  placed: "warning",
  accepted: "info",
  packed: "secondary",
  delivered: "success",
};

export function OrdersBoard({ date, locked, groups }: { date: string; locked: boolean; groups: Group[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flags, setFlag] = useOptimistic<Record<string, boolean>, [string, boolean]>({}, (s, [id, v]) => ({ ...s, [id]: v }));
  const placed = groups.flatMap((g) => g.orders).filter((o) => o.status === "placed").length;

  function toggle(order: Order, item: Item) {
    if (!locked) return toast(t("vendorOrders.lockFirst"));
    if (order.status !== "placed" && order.status !== "accepted") return;
    const now = flags[item.id] ?? item.available ?? true;
    const next = !now;
    start(async () => {
      setFlag([item.id, next]);
      const res = await setItemAvailable(item.id, next);
      if (!res.ok) {
        toast(t(`errors.${res.error}`));
        return;
      }
      router.refresh();
      if (!next)
        toast(t("vendorOrders.unavailableToast", { item: item.name, flat: order.flat }), {
          duration: 5000,
          action: {
            label: t("common.undo"),
            onClick: async () => {
              await setItemAvailable(item.id, true);
              router.refresh();
            },
          },
        });
    });
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">{locked ? t("vendorOrders.hint") : t("vendorOrders.lockFirst")}</p>
      {groups.map((g) => (
        <section key={g.id} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">
            {g.name} <span className="text-sm font-normal text-muted-foreground">· {t("common.houses", { count: g.orders.length })}</span>
          </h2>
          {g.orders.map((o) => (
            <article key={o.id} className="flex flex-col gap-3 rounded-[1.375rem] bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-primary px-3 py-1.5 text-lg font-bold text-primary-foreground">{o.flat}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{o.customer}</span>
                  <span className="text-sm text-muted-foreground">{o.estimate}</span>
                </span>
                <Badge variant={badge[o.status] ?? "secondary"}>{t(`orderStatus.${o.status}`)}</Badge>
              </div>
              <ul className="flex flex-wrap gap-2">
                {o.items.map((i) => {
                  const avail = flags[i.id] ?? i.available;
                  return (
                    <li key={i.id}>
                      <button
                        type="button"
                        onClick={() => toggle(o, i)}
                        aria-pressed={avail === false}
                        className={cn(
                          "flex h-11 items-center gap-2 rounded-full border px-3 text-sm font-medium",
                          avail === false ? "border-urgent/30 bg-urgent-soft text-urgent line-through" : "border-transparent bg-secondary",
                        )}
                      >
                        {avail !== null && <StatusMark available={avail} showLabel={false} className="[&>span]:size-5" />}
                        {i.name} · {i.qty}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </section>
      ))}
      {locked && placed > 0 && (
        <ActionBar aboveNav>
          <Button
            size="lg"
            className="w-full shadow-raised"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await acceptOrders(date);
                if (!res.ok) return void toast(t(`errors.${res.error}`));
                toast(t("vendorOrders.acceptedToast", { count: res.data ?? placed }));
                router.refresh();
              })
            }
          >
            {t("vendorOrders.acceptAll", { count: placed })}
          </Button>
        </ActionBar>
      )}
    </>
  );
}
