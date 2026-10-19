"use client";

import { Check, ChevronDown, Mic, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ActionBar } from "@/components/action-bar";
import { ConfirmButton } from "@/components/confirm-button";
import { PriceRangeEditor } from "@/components/price-range-editor";
import { SpeechButton } from "@/components/speech-input";
import { StatusMark } from "@/components/status-mark";
import { Button } from "@/components/ui/button";
import { VegImage } from "@/components/veg-image";
import { useRouter } from "@/i18n/navigation";
import { addItems, updateItems } from "@/lib/actions/vendor";
import { defaultStep, formatRange } from "@/lib/format";
import { parsePriceList } from "@/lib/list-parser";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

export type CatalogueRow = {
  catalogueItemId: string;
  name: string;
  alt: string;
  names: string[];
  photo: string | null;
  category: Enums<"item_category">;
  defaultUnit: Enums<"item_unit">;
};
export type MyItem = CatalogueRow & {
  id: string;
  unit: Enums<"item_unit">;
  min: number;
  max: number;
  reason: Enums<"reason_tag"> | null;
  available: boolean;
};

const REASONS: Enums<"reason_tag">[] = ["morning_market", "farm_fresh", "organic", "seasonal"];

export function ItemsManager({ items, others }: { items: MyItem[]; others: CatalogueRow[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "type" | "add">("list");

  const unit = (u: string) => t(`units.${u}` as "units.kg");
  const per = (u: Enums<"item_unit">) => (u === "g" ? `100 ${unit("g")}` : unit(u));

  function save(patches: Parameters<typeof updateItems>[0], message = t("common.saved")) {
    start(async () => {
      const res = await updateItems(patches);
      if (!res.ok) return void toast(t(`errors.${res.error}`));
      toast(message);
      router.refresh();
    });
  }

  if (mode === "type") return <TypePrices items={items} others={others} onDone={() => setMode("list")} />;
  if (mode === "add") return <AddItems others={others} onDone={() => setMode("list")} />;

  return (
    <div className="flex flex-col gap-4 px-4 pb-10">
      <button
        type="button"
        onClick={() => setMode("type")}
        className="flex items-center gap-3 rounded-[1.375rem] bg-accent p-4 text-left text-accent-foreground shadow-card"
      >
        <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-primary text-accent">
          <Mic className="size-5" />
        </span>
        <span>
          <span className="block font-semibold">{t("vendorItems.byList")}</span>
          <span className="text-sm">{t("vendorItems.stockHint")}</span>
        </span>
      </button>
      <p className="text-sm text-muted-foreground">{t("vendorItems.availHint")}</p>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <ItemRow
            key={i.id}
            item={i}
            open={open === i.id}
            busy={pending}
            per={per(i.unit)}
            onOpen={() => setOpen(open === i.id ? null : i.id)}
            onToggle={() => save([{ id: i.id, patch: { available: !i.available } }])}
            onSave={(min, max, reason) => save([{ id: i.id, patch: { price_min: min, price_max: max, reason_tag: reason } }])}
            onHide={() => save([{ id: i.id, patch: { listed: false } }])}
          />
        ))}
      </ul>
      {others.length > 0 && (
        <Button variant="outline" onClick={() => setMode("add")}>
          <Plus aria-hidden />
          {t("vendorItems.addMore")}
        </Button>
      )}
    </div>
  );
}

function ItemRow({
  item,
  open,
  busy,
  per,
  onOpen,
  onToggle,
  onSave,
  onHide,
}: {
  item: MyItem;
  open: boolean;
  busy: boolean;
  per: string;
  onOpen: () => void;
  onToggle: () => void;
  onSave: (min: number, max: number, reason: Enums<"reason_tag"> | null) => void;
  onHide: () => void;
}) {
  const t = useTranslations();
  const [min, setMin] = useState(item.min);
  const [max, setMax] = useState(item.max);
  const [reason, setReason] = useState(item.reason);
  return (
    <li className="rounded-[1.375rem] bg-card p-2.5 shadow-card">
      <div className="flex items-center gap-3">
        <VegImage photo={item.photo} category={item.category} className={cn("size-14 shrink-0 rounded-2xl", !item.available && "opacity-45 grayscale")} />
        <button type="button" onClick={onOpen} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-1 text-left">
          <span className="min-w-0 flex-1">
            <span className="block leading-tight font-semibold">{item.name}</span>
            <span className="text-sm text-muted-foreground">
              {formatRange(item.min, item.max)} / {per}
            </span>
          </span>
          <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          aria-pressed={item.available}
          aria-label={`${item.name}: ${item.available ? t("a11y.available") : t("a11y.notAvailable")}`}
          className={cn("flex h-11 shrink-0 items-center rounded-full px-2", item.available ? "bg-mint" : "bg-urgent-soft")}
        >
          <StatusMark available={item.available} showLabel={false} />
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-3 px-1 pt-3 pb-1">
          <PriceRangeEditor min={min} max={max} onChange={(a, b) => (setMin(a), setMax(b))} />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">{t("vendorItems.reason")}</span>
            <div className="flex flex-wrap gap-2">
              {[null, ...REASONS].map((r) => (
                <button
                  key={r ?? "none"}
                  type="button"
                  aria-pressed={reason === r}
                  onClick={() => setReason(r)}
                  className={cn("h-10 rounded-full px-3 text-sm font-semibold", reason === r ? "bg-primary text-primary-foreground" : "bg-secondary")}
                >
                  {r ? t(`reasonTags.${r}`) : t("vendorItems.noReason")}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ConfirmButton
              trigger={<Button variant="outline-danger">{t("vendorItems.hide")}</Button>}
              title={`${t("vendorItems.hide")}: ${item.name}?`}
              confirmLabel={t("vendorItems.hide")}
              cancelLabel={t("common.cancel")}
              onConfirm={onHide}
            />
            <Button loading={busy} disabled={min <= 0} onClick={() => onSave(min, max, reason)}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** "tomato 30-40, eerulli 35-45" → price ranges for listed items, and new items to start selling. */
function TypePrices({ items, others, onDone }: { items: MyItem[]; others: CatalogueRow[]; onDone: () => void }) {
  const t = useTranslations();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const matchable = useMemo(
    () => [
      ...items.map((i) => ({ ...i, key: i.id, id: i.catalogueItemId, step: defaultStep(i.unit), isNew: false })),
      ...others.map((o) => ({ ...o, key: o.catalogueItemId, id: o.catalogueItemId, unit: o.defaultUnit, step: defaultStep(o.defaultUnit), isNew: true })),
    ],
    [items, others],
  );
  const [parsed, setParsed] = useState<ReturnType<typeof parsePriceList<(typeof matchable)[number]>> | null>(null);
  const found = (parsed ?? []).filter((l) => l.item);

  async function apply() {
    setBusy(true);
    const updates = found.filter((l) => l.item && !l.item.isNew);
    const fresh = found.filter((l) => l.item && l.item.isNew);
    const r1 = updates.length
      ? await updateItems(updates.map((l) => ({ id: l.item!.key, patch: { price_min: (l as { min: number }).min, price_max: (l as { max: number }).max, available: true } })))
      : ({ ok: true } as const);
    const r2 = fresh.length
      ? await addItems(fresh.map((l) => ({ catalogueItemId: l.item!.id, unit: l.item!.unit, min: (l as { min: number }).min, max: (l as { max: number }).max })))
      : ({ ok: true } as const);
    setBusy(false);
    const bad = !r1.ok ? r1 : !r2.ok ? r2 : null;
    if (bad && !bad.ok) return toast(t(`errors.${bad.error}`));
    toast(t("vendorItems.updated", { count: found.length }));
    router.refresh();
    onDone();
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-44">
      {!parsed ? (
        <>
          <p className="text-muted-foreground">{t("vendorItems.stockHint")}</p>
          <label className="sr-only" htmlFor="prices">
            {t("vendorItems.byList")}
          </label>
          <textarea
            id="prices"
            autoFocus
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="tomato 30-40, eerulli 35-45, palak 15-20"
            className="rounded-[1.375rem] border-2 border-input bg-card p-4 text-lg outline-none focus:border-primary"
          />
          <SpeechButton onText={(heard) => setText((p) => (p.trim() ? `${p.trim()}, ${heard}` : heard))} />
        </>
      ) : (
        <ul className="flex flex-col gap-2">
          {parsed.map((l, n) => (
            <li
              key={n}
              className={cn(
                "flex items-center gap-3 rounded-[1.25rem] p-3",
                l.item ? "bg-card shadow-card" : "border-2 border-dashed border-destructive bg-[#fdf1f1]",
              )}
            >
              {l.item ? <VegImage photo={l.item.photo} category={l.item.category} className="size-12 shrink-0 rounded-xl" /> : <span className="size-12 shrink-0 rounded-xl bg-muted" />}
              <span className="min-w-0 flex-1">
                <span className="block leading-tight font-semibold">
                  {l.item ? l.item.name : t("list.notUnderstood")}
                  {l.item?.isNew && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">{t("vendorItems.newItem")}</span>}
                </span>
                <span className="block truncate text-sm text-muted-foreground">“{l.text}”</span>
              </span>
              {l.item && "min" in l ? (
                <>
                  <span className="font-semibold whitespace-nowrap">{formatRange(l.min!, l.max!)}</span>
                  <Check className="size-5 text-success" aria-label={t("a11y.available")} />
                </>
              ) : (
                <X className="size-5 text-destructive" aria-label={t("list.notUnderstood")} />
              )}
            </li>
          ))}
        </ul>
      )}
      <ActionBar aboveNav>
        {!parsed ? (
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button size="lg" variant="outline" onClick={onDone}>
              {t("common.cancel")}
            </Button>
            <Button size="lg" disabled={!text.trim()} onClick={() => setParsed(parsePriceList(text, matchable))}>
              {t("list.read")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button size="lg" variant="outline" onClick={() => setParsed(null)}>
              {t("list.edit")}
            </Button>
            <Button size="lg" loading={busy} disabled={!found.length} onClick={apply}>
              {t("vendorItems.update", { count: found.length })}
            </Button>
          </div>
        )}
      </ActionBar>
    </div>
  );
}

function AddItems({ others, onDone }: { others: CatalogueRow[]; onDone: () => void }) {
  const t = useTranslations();
  const router = useRouter();
  const [picked, setPicked] = useState<Record<string, { min: number; max: number }>>({});
  const [busy, setBusy] = useState(false);
  const count = Object.keys(picked).length;

  async function add() {
    setBusy(true);
    const res = await addItems(
      Object.entries(picked).map(([id, p]) => ({ catalogueItemId: id, unit: others.find((o) => o.catalogueItemId === id)!.defaultUnit, ...p })),
    );
    setBusy(false);
    if (!res.ok) return toast(t(`errors.${res.error}`));
    toast(t("vendorItems.updated", { count }));
    router.refresh();
    onDone();
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-44">
      <p className="text-muted-foreground">{t("vendorSetup.pickHint")}</p>
      <ul className="flex flex-col gap-2">
        {others.map((o) => {
          const p = picked[o.catalogueItemId];
          return (
            <li key={o.catalogueItemId} className={cn("rounded-[1.375rem] bg-card p-2.5 shadow-card", p && "ring-2 ring-primary")}>
              <button
                type="button"
                aria-pressed={!!p}
                onClick={() =>
                  setPicked((s) => {
                    const next = { ...s };
                    if (next[o.catalogueItemId]) delete next[o.catalogueItemId];
                    else next[o.catalogueItemId] = { min: 20, max: 30 };
                    return next;
                  })
                }
                className="flex w-full items-center gap-3 text-left"
              >
                <VegImage photo={o.photo} category={o.category} className="size-14 shrink-0 rounded-2xl" />
                <span className="min-w-0 flex-1">
                  <span className="block leading-tight font-semibold">{o.name}</span>
                  <span className="text-sm text-muted-foreground">{o.alt}</span>
                </span>
                <span
                  aria-hidden
                  className={cn("flex size-8 items-center justify-center rounded-full", p ? "bg-primary text-accent" : "border-2 border-input")}
                >
                  {p && <Check className="size-4" strokeWidth={3} />}
                </span>
              </button>
              {p && (
                <div className="px-1 pt-3">
                  <PriceRangeEditor
                    min={p.min}
                    max={p.max}
                    onChange={(min, max) => setPicked((s) => ({ ...s, [o.catalogueItemId]: { min, max } }))}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <ActionBar aboveNav>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button size="lg" variant="outline" onClick={onDone}>
            {t("common.cancel")}
          </Button>
          <Button size="lg" loading={busy} disabled={!count} onClick={add}>
            {t("vendorItems.update", { count })}
          </Button>
        </div>
      </ActionBar>
    </div>
  );
}
