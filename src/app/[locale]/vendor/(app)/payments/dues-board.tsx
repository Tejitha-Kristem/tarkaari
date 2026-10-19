"use client";

import { BellRing, CheckCircle2, MessageCircle, Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { confirmPayment, recordCash, rejectPayment, remind, setHouseholdPaused } from "@/lib/actions/vendor";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Due = {
  householdId: string;
  flat: string;
  apartment: string;
  name: string;
  phone: string | null;
  balance: number;
  since: string | null;
  overLimit: boolean;
  paused: boolean;
  pending: { id: string; amount: number; method: "upi" | "cash" } | null;
};

export function DuesBoard({ dues, shop, upiId }: { dues: Due[]; shop: string; upiId: string | null }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cashFor, setCashFor] = useState<string | null>(null);
  const [cash, setCash] = useState("");
  const unpaid = dues.filter((d) => d.balance > 0 && !d.pending);

  const act = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast(t(`errors.${res.error}` as "errors.generic"));
      toast(done);
      router.refresh();
    });

  const waText = (d: Due) =>
    `${t("notifications.manual_reminder", { amount: rupees(d.balance) })} — ${shop}${upiId ? ` · UPI: ${upiId}` : ""}`;

  if (dues.length === 0)
    return (
      <div className="px-4 pt-5">
        <EmptyState icon={CheckCircle2} title={t("vendorPay.allClear")} />
      </div>
    );

  return (
    <div className="flex flex-col gap-3 px-4 pt-5 pb-10">
      {unpaid.length > 0 && (
        <Button
          variant="dark"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await Promise.all(unpaid.map((d) => remind(d.householdId)));
              toast(t("vendorPay.remindedToast"));
            })
          }
        >
          <BellRing aria-hidden />
          {t("vendorPay.remindAll", { count: unpaid.length })}
        </Button>
      )}
      {dues.map((d) => (
        <article key={d.householdId} className={cn("flex flex-col gap-3 rounded-[1.375rem] bg-card p-4 shadow-card", d.pending && "ring-2 ring-accent")}>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-primary px-3 py-1.5 text-lg font-bold text-primary-foreground">{d.flat}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{d.name}</span>
              <span className="text-sm text-muted-foreground">
                {d.apartment}
                {d.since && ` · ${t("vendorPay.unpaidSince", { date: d.since })}`}
              </span>
            </span>
            <span className="text-xl font-bold">{rupees(d.balance)}</span>
          </div>

          {d.pending ? (
            <>
              <p className="rounded-2xl bg-butter p-3 text-sm font-semibold">
                {d.pending.method === "upi"
                  ? t("vendorPay.upiClaimed", { amount: rupees(d.pending.amount) })
                  : t("vendorPay.cashClaimed", { amount: rupees(d.pending.amount) })}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <ConfirmButton
                  trigger={
                    <Button variant="outline-danger" disabled={pending}>
                      {t("vendorPay.notReceived")}
                    </Button>
                  }
                  title={`${t("vendorPay.notReceived")}: ${d.flat} · ${rupees(d.pending.amount)}?`}
                  confirmLabel={t("vendorPay.notReceived")}
                  cancelLabel={t("common.cancel")}
                  onConfirm={() => act(() => rejectPayment(d.pending!.id), t("vendorPay.rejectedToast"))}
                />
                <Button disabled={pending} onClick={() => act(() => confirmPayment(d.pending!.id), t("vendorPay.confirmedToast"))}>
                  {t("vendorPay.confirm")}
                </Button>
              </div>
            </>
          ) : cashFor === d.householdId ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const amount = Number(cash);
                act(() => recordCash(d.householdId, amount), t("vendorPay.confirmedToast"));
                setCashFor(null);
              }}
            >
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{t("vendorPay.cashQ", { flat: d.flat })}</span>
                <Input inputMode="decimal" autoFocus value={cash} onChange={(e) => setCash(e.target.value.replace(/[^\d.]/g, ""))} aria-label={t("vendorPay.amount")} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setCashFor(null)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={pending || !(Number(cash) > 0)}>
                  {t("vendorPay.cashReceived")}
                </Button>
              </div>
            </form>
          ) : (
            d.balance > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCash(String(d.balance));
                    setCashFor(d.householdId);
                  }}
                >
                  {t("vendorPay.cashReceived")}
                </Button>
                {d.phone ? (
                  <Button asChild variant="outline">
                    <a
                      href={`https://wa.me/${d.phone.replace(/\D/g, "")}?text=${encodeURIComponent(waText(d))}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => remind(d.householdId)}
                    >
                      <MessageCircle aria-hidden />
                      {t("vendorPay.remind")}
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" disabled={pending} onClick={() => act(() => remind(d.householdId), t("vendorPay.remindedToast"))}>
                    <BellRing aria-hidden />
                    {t("vendorPay.remind")}
                  </Button>
                )}
              </div>
            )
          )}

          {(d.overLimit || d.paused) && (
            <div className="flex flex-col gap-2 border-t pt-3">
              {d.overLimit && !d.paused && <p className="text-sm font-semibold text-urgent">{t("vendorPay.overLimit")}</p>}
              {d.paused ? (
                <Button variant="outline" disabled={pending} onClick={() => act(() => setHouseholdPaused(d.householdId, false), t("vendorPay.resumedToast", { flat: d.flat }))}>
                  <Play aria-hidden />
                  {t("vendorPay.resume")}
                </Button>
              ) : (
                <ConfirmButton
                  trigger={
                    <Button variant="outline-danger">
                      <Pause aria-hidden />
                      {t("vendorPay.pause")}
                    </Button>
                  }
                  title={t("vendorPay.pauseQ", { flat: d.flat })}
                  confirmLabel={t("vendorPay.pause")}
                  cancelLabel={t("common.cancel")}
                  onConfirm={() => act(() => setHouseholdPaused(d.householdId, true), t("vendorPay.pausedToast", { flat: d.flat }))}
                />
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
