"use client";

import { Building2, CalendarOff, Copy, MessageCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ApartmentPicker } from "@/components/apartment-picker";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { addHoliday, addServedApartment, removeHoliday, resetInvite, saveApartmentTerms, setApartmentActive } from "@/lib/actions/vendor";
import { rupees, windowLabel } from "@/lib/format";
import { whatsappShare } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

type Terms = {
  delivery_window_start: string;
  delivery_window_end: string;
  payment_mode: Enums<"payment_mode">;
  payment_method: Enums<"payment_method">;
  unpaid_limit: number;
};

function useAct() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast(t(`errors.${res.error}` as "errors.generic"));
      if (done) toast(done);
      router.refresh();
    });
  return { pending, act, t };
}

function Chips<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn("h-11 rounded-full text-sm font-semibold", value === o.v ? "bg-primary text-primary-foreground" : "bg-secondary")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ApartmentCard({
  apartmentId,
  name,
  area,
  active,
  households,
  link,
  shareText,
  terms,
}: {
  apartmentId: string;
  name: string;
  area: string | null;
  active: boolean;
  households: number;
  link: string | null;
  shareText: string;
  terms: Terms;
}) {
  const { pending, act, t } = useAct();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(terms);

  return (
    <section className={cn("flex flex-col gap-3 rounded-[1.5rem] bg-card p-4 shadow-card", !active && "opacity-70")}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-12 items-center justify-center rounded-2xl bg-lilac text-primary">
          <Building2 className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg leading-tight font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">
            {[area, t("vendorApts.joined", { count: households })].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <p className="text-sm">
        {windowLabel(terms.delivery_window_start, terms.delivery_window_end, locale)} · {t(`paymentMode.${terms.payment_mode}`)} ·{" "}
        {t(`paymentMethod.${terms.payment_method}`)} · {t("vendorApts.limit", { amount: rupees(terms.unpaid_limit) })}
      </p>

      {active && link && (
        <div className="flex flex-col gap-2 rounded-2xl bg-mint p-3">
          <p className="text-xs font-semibold text-muted-foreground">{t("vendorApts.joinLink")}</p>
          <p className="truncate font-mono text-sm">{link}</p>
          <Button asChild>
            <a href={whatsappShare(shareText)} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden />
              {t("vendorApts.shareGroup")}
            </a>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  toast(t("common.copied"));
                } catch {}
              }}
            >
              <Copy aria-hidden />
              {t("common.copy")}
            </Button>
            <ConfirmButton
              trigger={
                <Button variant="outline" size="sm" loading={pending}>
                  <RefreshCw aria-hidden />
                  {t("vendorApts.newLink")}
                </Button>
              }
              title={t("vendorApts.newLinkQ")}
              confirmLabel={t("vendorApts.newLink")}
              cancelLabel={t("common.cancel")}
              destructive={false}
              onConfirm={() => act(() => resetInvite(apartmentId), t("common.saved"))}
            />
          </div>
        </div>
      )}

      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">{t("vendorSetup.window")}</span>
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" value={form.delivery_window_start} onChange={(e) => setForm({ ...form, delivery_window_start: e.target.value })} />
              <Input type="time" value={form.delivery_window_end} onChange={(e) => setForm({ ...form, delivery_window_end: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">{t("vendorSetup.mode")}</span>
            <Chips
              value={form.payment_mode}
              onChange={(v) => setForm({ ...form, payment_mode: v })}
              options={[
                { v: "per_delivery", label: t("paymentMode.per_delivery") },
                { v: "monthly", label: t("paymentMode.monthly") },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">{t("vendorSetup.method")}</span>
            <Chips
              value={form.payment_method}
              onChange={(v) => setForm({ ...form, payment_method: v })}
              options={[
                { v: "upi", label: t("paymentMethod.upi") },
                { v: "cash", label: t("paymentMethod.cash") },
              ]}
            />
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">{t("vendorApts.limit", { amount: "₹" })}</span>
            <Input
              inputMode="numeric"
              value={String(form.unpaid_limit)}
              onChange={(e) => setForm({ ...form, unpaid_limit: Number(e.target.value.replace(/\D/g, "")) || 0 })}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => (setForm(terms), setEditing(false))}>
              {t("common.cancel")}
            </Button>
            <Button
              loading={pending}
              onClick={() => {
                act(() => saveApartmentTerms(apartmentId, form), t("common.saved"));
                setEditing(false);
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            {t("vendorApts.editTerms")}
          </Button>
          {active ? (
            <ConfirmButton
              trigger={
                <Button variant="outline-danger" size="sm">
                  {t("vendorApts.stop")}
                </Button>
              }
              title={`${t("vendorApts.stop")}: ${name}?`}
              confirmLabel={t("vendorApts.stop")}
              cancelLabel={t("common.cancel")}
              onConfirm={() => act(() => setApartmentActive(apartmentId, false))}
            />
          ) : (
            <Button size="sm" loading={pending} onClick={() => act(() => setApartmentActive(apartmentId, true))}>
              {t("admin.activate")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

export function AddApartment() {
  const { pending, act, t } = useAct();
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        {t("vendorApts.addApartment")}
      </Button>
    );
  return (
    <section className="flex flex-col gap-3 rounded-[1.5rem] bg-card p-4 shadow-card">
      <h2 className="font-semibold">{t("vendorApts.addApartment")}</h2>
      <ApartmentPicker
        value={null}
        onPick={(a) => {
          if (pending) return;
          act(() => addServedApartment(a.id), t("common.saved"));
          setOpen(false);
        }}
      />
      <Button variant="ghost" onClick={() => setOpen(false)}>
        {t("common.cancel")}
      </Button>
    </section>
  );
}

export function Holidays({ dates, min }: { dates: { date: string; label: string }[]; min: string }) {
  const { pending, act, t } = useAct();
  const [date, setDate] = useState("");
  return (
    <section className="flex flex-col gap-3 rounded-[1.5rem] bg-card p-4 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarOff className="size-5 text-primary" aria-hidden />
        {t("vendorApts.holidays")}
      </h2>
      {dates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("vendorApts.noHolidays")}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {dates.map((d) => (
            <li key={d.date} className="flex items-center justify-between py-2">
              <span className="font-medium">{d.label}</span>
              <ConfirmButton
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={t("vendorApts.removeHoliday")}>
                    <Trash2 aria-hidden />
                  </Button>
                }
                title={`${t("vendorApts.removeHoliday")}: ${d.label}?`}
                confirmLabel={t("vendorApts.removeHoliday")}
                cancelLabel={t("common.cancel")}
                onConfirm={() => act(() => removeHoliday(d.date))}
              />
            </li>
          ))}
        </ul>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-foreground">{t("vendorApts.holidayDate")}</span>
        <Input type="date" min={min} value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <Button
        variant="dark"
        loading={pending} disabled={!date}
        onClick={() => {
          act(() => addHoliday(date), t("common.saved"));
          setDate("");
        }}
      >
        {t("vendorApts.addHoliday")}
      </Button>
    </section>
  );
}
