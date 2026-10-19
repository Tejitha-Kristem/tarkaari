"use client";

import { ArrowLeft, Camera, Check, Minus, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { ActionBar } from "@/components/action-bar";
import { ApartmentPicker, type PickedApartment } from "@/components/apartment-picker";
import { LanguageSwitch } from "@/components/language-switch";
import { PriceRangeEditor } from "@/components/price-range-editor";
import { SpeechButton } from "@/components/speech-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VegImage } from "@/components/veg-image";
import { createVendorShop, type SetupApartment } from "@/lib/actions/vendor-setup";
import { windowLabel } from "@/lib/format";
import { shrinkImage } from "@/lib/image";
import { parsePriceList } from "@/lib/list-parser";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

type Entry = {
  id: string;
  slug: string;
  name_en: string;
  name_kn: string;
  photo: string | null;
  default_unit: Enums<"item_unit">;
  category: Enums<"item_category">;
  aliases: string[];
};
type Step = "shop" | "apartments" | "charge" | "items";
const STEPS: Step[] = ["shop", "apartments", "charge", "items"];
const WINDOWS: [string, string][] = [["06:00", "08:00"], ["07:00", "09:00"], ["08:00", "10:00"], ["09:00", "11:00"]];
const UPI = /^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9]{2,64}$/;

// Sensible starting prices so vendors adjust rather than type from zero.
const START: Record<Enums<"item_unit">, [number, number]> = { kg: [30, 40], g: [10, 15], piece: [5, 10], bunch: [10, 15], packet: [20, 30] };

export function VendorSetupWizard({ userId, initialName, catalogue }: { userId: string; initialName: string; catalogue: Entry[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const [i, setI] = useState(0);
  const step = STEPS[i];

  const [ownerName, setOwnerName] = useState(initialName);
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [upi, setUpi] = useState("");
  const [photos, setPhotos] = useState<{ shop: string | null; id: string | null }>({ shop: null, id: null });
  const [previews, setPreviews] = useState<{ shop: string | null; id: string | null }>({ shop: null, id: null });
  const [apts, setApts] = useState<(SetupApartment & { name: string; area: string })[]>([]);
  const [picking, setPicking] = useState(true);
  const [charge, setCharge] = useState(10);
  const [items, setItems] = useState<Record<string, { min: number; max: number }>>({});
  const [priceText, setPriceText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = (e: Entry) => (locale === "kn" ? e.name_kn : e.name_en);
  const matchable = useMemo(
    () => catalogue.map((e) => ({ ...e, unit: e.default_unit, step: 1, names: [e.name_en, e.name_kn, ...e.aliases] })),
    [catalogue],
  );

  async function upload(kind: "shop" | "id", file: File) {
    const blob = await shrinkImage(file);
    const path = `${userId}/${kind}-${crypto.randomUUID()}.jpg`;
    const bucket = kind === "shop" ? "shop-photos" : "id-photos";
    const { error } = await createClient().storage.from(bucket).upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) {
      setError(t("errors.generic"));
      return;
    }
    setPhotos((p) => ({ ...p, [kind]: path }));
    setPreviews((p) => ({ ...p, [kind]: URL.createObjectURL(blob) }));
  }

  function addApartment(a: PickedApartment) {
    if (!apts.some((x) => x.apartmentId === a.id)) {
      setApts([...apts, { apartmentId: a.id, name: a.name, area: a.area, windowStart: "07:00", windowEnd: "09:00", mode: "per_delivery", method: "upi" }]);
    }
    setPicking(false);
  }

  function applyPriceText() {
    const next = { ...items };
    for (const line of parsePriceList(priceText, matchable)) {
      if (line.item && "min" in line && line.min) next[line.item.id] = { min: line.min, max: line.max ?? line.min };
    }
    setItems(next);
    setPriceText("");
  }

  const stepError =
    step === "shop"
      ? !shopName.trim() || !ownerName.trim()
        ? t("vendorSetup.needShop")
        : upi && !UPI.test(upi.trim())
          ? t("vendorSetup.badUpi")
          : null
      : step === "apartments"
        ? apts.length === 0
          ? t("vendorSetup.needApt")
          : null
        : step === "items" && Object.keys(items).length === 0
          ? t("vendorSetup.needItem")
          : null;

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await createVendorShop({
      ownerName,
      shopName,
      address,
      upiId: upi,
      shopPhoto: photos.shop,
      idPhoto: photos.id,
      serviceCharge: charge,
      apartments: apts,
      items: Object.entries(items).map(([id, p]) => ({
        catalogueItemId: id,
        unit: catalogue.find((c) => c.id === id)!.default_unit,
        min: p.min,
        max: p.max,
      })),
    });
    if (!res.ok) {
      setBusy(false);
      setError(t(`errors.${res.error}`));
      return;
    }
    window.location.href = "/vendor/review";
  }

  const chip = (on: boolean) => cn("h-11 rounded-full px-4 text-sm font-semibold", on ? "bg-primary text-primary-foreground" : "bg-secondary");
  const titles = { shop: t("vendorSetup.stepShop"), apartments: t("vendorSetup.stepApts"), charge: t("vendorSetup.stepCharge"), items: t("vendorSetup.stepItems") };

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
        <div className="flex flex-1 gap-1.5" role="img" aria-label={t("onboarding.step", { n: i + 1, total: STEPS.length })}>
          {STEPS.map((s, n) => (
            <span key={s} className={cn("h-1.5 flex-1 rounded-full", n <= i ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
        <LanguageSwitch />
      </div>
      <p className="mt-5 text-sm font-semibold text-muted-foreground">{t("vendorSetup.title")}</p>
      <h1 className="mb-4 text-2xl font-semibold">{titles[step]}</h1>

      {step === "shop" && (
        <div className="flex flex-col gap-4">
          {(
            [
              ["shopName", shopName, setShopName, "organization"],
              ["yourName", ownerName, setOwnerName, "name"],
              ["address", address, setAddress, "street-address"],
            ] as const
          ).map(([key, value, set, ac]) => (
            <label key={key} className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{t(`vendorSetup.${key}`)}</span>
              <Input value={value} autoComplete={ac} onChange={(e) => set(e.target.value)} maxLength={key === "address" ? 300 : 80} />
            </label>
          ))}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{t("vendorSetup.upi")}</span>
            <Input value={upi} onChange={(e) => setUpi(e.target.value.trim())} placeholder={t("vendorSetup.upiHint")} autoCapitalize="none" inputMode="email" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["shop", "id"] as const).map((kind) => (
              <label key={kind} className="flex cursor-pointer flex-col gap-2 rounded-[1.25rem] bg-card p-3 shadow-card">
                <span className="text-sm font-semibold">
                  {kind === "shop" ? t("vendorSetup.shopPhoto") : t("vendorSetup.idPhoto")}{" "}
                  <span className="font-normal text-muted-foreground">({t("common.optional")})</span>
                </span>
                <span className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-mint">
                  {previews[kind] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local preview blob
                    <img src={previews[kind]!} alt="" className="size-full object-cover" />
                  ) : (
                    <Camera className="size-8 text-primary" aria-hidden />
                  )}
                </span>
                <span className="text-center text-sm font-semibold text-primary">{previews[kind] ? t("vendorSetup.changePhoto") : t("vendorSetup.addPhoto")}</span>
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(kind, e.target.files[0])} />
              </label>
            ))}
          </div>
        </div>
      )}

      {step === "apartments" && (
        <div className="flex flex-col gap-4">
          {apts.map((a, n) => (
            <div key={a.apartmentId} className="flex flex-col gap-3 rounded-[1.375rem] bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-sm text-muted-foreground">{a.area}</p>
                </div>
                <button type="button" aria-label={t("vendorSetup.removeApt")} onClick={() => setApts(apts.filter((_, k) => k !== n))} className="flex size-11 items-center justify-center rounded-full bg-secondary">
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </div>
              <span className="text-sm font-semibold">{t("vendorSetup.window")}</span>
              <div className="flex flex-wrap gap-2">
                {WINDOWS.map(([s, e]) => (
                  <button key={s} type="button" aria-pressed={a.windowStart === s} className={chip(a.windowStart === s)} onClick={() => setApts(apts.map((x, k) => (k === n ? { ...x, windowStart: s, windowEnd: e } : x)))}>
                    {windowLabel(s, e, locale)}
                  </button>
                ))}
              </div>
              <span className="text-sm font-semibold">{t("vendorSetup.mode")}</span>
              <div className="flex flex-wrap gap-2">
                {(["per_delivery", "monthly"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={a.mode === m} className={chip(a.mode === m)} onClick={() => setApts(apts.map((x, k) => (k === n ? { ...x, mode: m } : x)))}>
                    {t(`paymentMode.${m}`)}
                  </button>
                ))}
                {(["upi", "cash"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={a.method === m} className={chip(a.method === m)} onClick={() => setApts(apts.map((x, k) => (k === n ? { ...x, method: m } : x)))}>
                    {t(`paymentMethod.${m}`)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {picking ? (
            <ApartmentPicker value={null} onPick={addApartment} />
          ) : (
            <Button variant="outline" onClick={() => setPicking(true)}>
              <Plus aria-hidden />
              {t("vendorApts.addApartment")}
            </Button>
          )}
        </div>
      )}

      {step === "charge" && (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground">{t("vendorSetup.chargeHint")}</p>
          <div className="flex items-center justify-between rounded-[1.375rem] bg-card p-4 shadow-card">
            <button type="button" aria-label="−" onClick={() => setCharge(Math.max(0, charge - 5))} className="flex size-14 items-center justify-center rounded-full bg-secondary">
              <Minus className="size-6" aria-hidden />
            </button>
            <output className="text-4xl font-semibold tabular-nums">₹{charge}</output>
            <button type="button" aria-label="+" onClick={() => setCharge(Math.min(100, charge + 5))} className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Plus className="size-6" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {step === "items" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-[1.375rem] bg-card p-3 shadow-card">
            <span className="text-sm font-semibold">{t("vendorSetup.typePrices")}</span>
            <textarea
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              rows={2}
              placeholder={t("vendorItems.stockHint")}
              className="rounded-2xl border-2 border-input p-3 text-base outline-none focus:border-primary"
            />
            <div className="grid grid-cols-2 gap-2">
              <SpeechButton className="h-12 text-base" onText={(txt) => setPriceText((p) => (p ? `${p}, ${txt}` : txt))} />
              <Button variant="dark" className="h-12" disabled={!priceText.trim()} onClick={applyPriceText}>
                {t("list.read")}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("vendorSetup.pickHint")} · {t("vendorSetup.selected", { count: Object.keys(items).length })}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {catalogue.map((e) => {
              const on = !!items[e.id];
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = { ...items };
                    if (on) delete next[e.id];
                    else next[e.id] = { min: START[e.default_unit][0], max: START[e.default_unit][1] };
                    setItems(next);
                  }}
                  className={cn("relative flex flex-col gap-1 rounded-2xl p-1.5 text-left", on ? "bg-primary text-primary-foreground" : "bg-card shadow-card")}
                >
                  <VegImage photo={e.photo} category={e.category} className="aspect-square rounded-xl" />
                  {on && (
                    <span className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                  <span className="line-clamp-2 px-1 text-sm leading-tight font-semibold">{name(e)}</span>
                </button>
              );
            })}
          </div>
          {Object.keys(items).length > 0 && (
            <div className="flex flex-col gap-3">
              {catalogue
                .filter((e) => items[e.id])
                .map((e) => (
                  <div key={e.id} className="flex flex-col gap-2 rounded-[1.375rem] bg-card p-3 shadow-card">
                    <div className="flex items-center gap-3">
                      <VegImage photo={e.photo} category={e.category} className="size-11 rounded-xl" />
                      <span className="flex-1 font-semibold">{name(e)}</span>
                      <span className="text-sm text-muted-foreground">/ {e.default_unit === "g" ? `100 ${t("units.g")}` : t(`units.${e.default_unit}`)}</span>
                    </div>
                    <PriceRangeEditor min={items[e.id].min} max={items[e.id].max} onChange={(min, max) => setItems({ ...items, [e.id]: { min, max } })} />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}

      <ActionBar>
        {stepError && i > 0 && step !== "apartments" ? null : null}
        <Button
          size="lg"
          className="w-full"
          disabled={busy || !!stepError}
          onClick={() => (step === "items" ? submit() : setI(i + 1))}
          title={stepError ?? undefined}
        >
          {step === "items" ? t("vendorSetup.submit") : t("common.continue")}
        </Button>
        {stepError && <p className="text-center text-sm text-muted-foreground">{stepError}</p>}
      </ActionBar>
    </main>
  );
}
