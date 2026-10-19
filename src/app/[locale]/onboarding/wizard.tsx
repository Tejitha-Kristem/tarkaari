"use client";

import { ArrowLeft, Check, Share2, Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ApartmentPicker, type PickedApartment } from "@/components/apartment-picker";
import { ActionBar } from "@/components/action-bar";
import { FlatPicker } from "@/components/flat-picker";
import { LanguageSwitch } from "@/components/language-switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveHousehold } from "@/lib/actions/onboarding";
import { windowLabel } from "@/lib/format";
import { joinLink, whatsappShare } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Step = "name" | "apartment" | "flat" | "vendor";
type VendorOption = { id: string; shopName: string; charge: number; window: string; inviteCode: string };

export function OnboardingWizard({
  initialName,
  invite,
}: {
  initialName: string;
  invite: { apartment: PickedApartment; vendorId: string | null; shopName: string | null } | null;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = [];
    if (!initialName) s.push("name");
    if (!invite) s.push("apartment");
    s.push("flat");
    if (!invite?.vendorId) s.push("vendor");
    return s;
  }, [initialName, invite]);

  const [i, setI] = useState(0);
  const [name, setName] = useState(initialName);
  const [apartment, setApartment] = useState<PickedApartment | null>(invite?.apartment ?? null);
  const [block, setBlock] = useState<string | null>(null);
  const [flat, setFlat] = useState("");
  const [vendors, setVendors] = useState<VendorOption[] | null>(null);
  const [aptCode, setAptCode] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(invite?.vendorId ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = steps[i];

  // Vendors who deliver to the chosen apartment (approved ones only; RLS hides the rest).
  useEffect(() => {
    if (step !== "vendor" || !apartment) return;
    const supabase = createClient();
    void (async () => {
      const [{ data }, { data: apt }] = await Promise.all([
        supabase
          .from("vendor_apartments")
          .select("invite_code, delivery_window_start, delivery_window_end, vendor:vendors!inner(id, shop_name, service_charge, approval_status)")
          .eq("apartment_id", apartment.id)
          .eq("active", true),
        supabase.from("apartments").select("invite_code").eq("id", apartment.id).maybeSingle(),
      ]);
      setAptCode(apt?.invite_code ?? null);
      const list = (data ?? [])
        .filter((r) => r.vendor.approval_status === "active")
        .map((r) => ({
          id: r.vendor.id,
          shopName: r.vendor.shop_name,
          charge: Number(r.vendor.service_charge),
          window: windowLabel(r.delivery_window_start, r.delivery_window_end, locale),
          inviteCode: r.invite_code,
        }));
      setVendors(list);
      if (list.length === 1) setVendorId(list[0].id);
    })();
  }, [step, apartment, locale]);

  const canNext =
    step === "name" ? name.trim().length > 0 : step === "apartment" ? !!apartment : step === "flat" ? flat.length > 0 : true;
  const last = i === steps.length - 1;

  async function finish() {
    if (!apartment) return;
    setBusy(true);
    setError(null);
    const res = await saveHousehold({ name, apartmentId: apartment.id, block, flatNo: flat, vendorId });
    if (!res.ok) {
      setBusy(false);
      setError(t(`errors.${res.error}`));
      return;
    }
    window.location.href = "/shop";
  }

  const title = { name: t("onboarding.nameTitle"), apartment: t("onboarding.aptTitle"), flat: t("onboarding.flatTitle"), vendor: t("onboarding.vendorTitle") }[step];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-4 pb-32">
      <div className="flex items-center gap-3">
        {i > 0 ? (
          <button type="button" onClick={() => setI(i - 1)} aria-label={t("common.back")} className="flex size-11 items-center justify-center rounded-full bg-card shadow-card">
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        ) : (
          <span className="size-11" />
        )}
        <div className="flex flex-1 gap-1.5" aria-label={t("onboarding.step", { n: i + 1, total: steps.length })} role="img">
          {steps.map((s, n) => (
            <span key={s} className={cn("h-1.5 flex-1 rounded-full", n <= i ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
        <LanguageSwitch />
      </div>

      {invite && (
        <p className="mt-4 rounded-2xl bg-mint px-4 py-3 text-sm font-semibold text-primary">
          {invite.shopName ? `${invite.shopName} · ` : ""}
          {invite.apartment.name}
        </p>
      )}

      <h1 className="mt-6 mb-4 text-2xl font-semibold">{title}</h1>

      {step === "name" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{t("onboarding.nameLabel")}</span>
          <Input autoFocus autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </label>
      )}

      {step === "apartment" && (
        <ApartmentPicker
          value={apartment}
          onPick={(a) => {
            setApartment(a);
            setI(i + 1);
          }}
        />
      )}

      {step === "flat" && <FlatPicker block={block} flat={flat} onBlock={setBlock} onFlat={setFlat} />}

      {step === "vendor" &&
        (vendors === null ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col gap-4 rounded-[1.375rem] bg-card p-5 shadow-card">
            <span aria-hidden className="flex size-12 items-center justify-center rounded-2xl bg-peach text-[#7a4a12]">
              <Store className="size-6" />
            </span>
            <p className="text-lg font-semibold">{t("onboarding.noVendorTitle")}</p>
            <p className="text-muted-foreground">{t("onboarding.noVendorBody")}</p>
            {aptCode && apartment && (
              <Button asChild variant="dark">
                <a href={whatsappShare(t("onboarding.inviteText", { apartment: apartment.name, link: joinLink(aptCode) }))} target="_blank" rel="noreferrer">
                  <Share2 aria-hidden />
                  {t("onboarding.shareWhatsApp")}
                </a>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground">{t("onboarding.vendorSub", { apartment: apartment?.name ?? "" })}</p>
            {vendors.map((v) => {
              const on = vendorId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setVendorId(v.id)}
                  className={cn("flex items-center gap-3 rounded-[1.375rem] p-4 text-left", on ? "bg-primary text-primary-foreground" : "bg-card shadow-card")}
                >
                  <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", on ? "bg-accent text-accent-foreground" : "bg-mint text-primary")}>
                    {on ? <Check className="size-6" /> : <Store className="size-6" />}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-lg font-semibold">{v.shopName}</span>
                    <span className={cn("text-sm", on ? "text-on-dark-muted" : "text-muted-foreground")}>
                      {t("onboarding.deliversAt", { window: v.window, charge: v.charge })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}

      {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}

      {step !== "apartment" && (
        <ActionBar>
          <Button size="lg" className="w-full" disabled={!canNext || busy || (step === "vendor" && vendors === null)} onClick={() => (last ? finish() : setI(i + 1))}>
            {last ? (step === "vendor" && !vendorId ? t("onboarding.finishNoVendor") : t("onboarding.finish")) : t("common.continue")}
          </Button>
        </ActionBar>
      )}
    </main>
  );
}
