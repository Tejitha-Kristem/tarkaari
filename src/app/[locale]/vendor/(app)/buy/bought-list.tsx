"use client";

import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { VegImage } from "@/components/veg-image";
import { whatsappShare } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

type Row = { id: string; name: string; alt: string; photo: string | null; category: Enums<"item_category">; qty: string; houses: string };

/** The buying list; ticks are kept on this phone only (per date and tab). */
export function BoughtList({ rows, storageKey, shareText }: { rows: Row[]; storageKey: string; shareText: string }) {
  const t = useTranslations("vendorBuy");
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    let saved: string[] = [];
    try {
      saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring per-phone ticks after hydration
    setDone(new Set(saved));
  }, [storageKey]);

  function toggle(id: string) {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDone(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {}
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const on = done.has(r.id);
          return (
            <li key={r.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(r.id)}
                className={cn("flex w-full items-center gap-3 rounded-[1.25rem] bg-card p-2.5 pr-4 text-left shadow-card", on && "opacity-60")}
              >
                <VegImage photo={r.photo} category={r.category} className="size-14 shrink-0 rounded-2xl" />
                <span className="min-w-0 flex-1">
                  <span className={cn("block leading-tight font-semibold", on && "line-through")}>{r.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {r.alt} · {r.houses}
                  </span>
                </span>
                <span className="text-lg font-bold whitespace-nowrap">{r.qty}</span>
                <span
                  aria-hidden
                  className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", on ? "bg-success text-white" : "border-2 border-input")}
                >
                  {on && <Check className="size-4" strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Button asChild variant="outline">
        <a href={whatsappShare(shareText)} target="_blank" rel="noreferrer">
          <Share2 aria-hidden />
          {t("share")}
        </a>
      </Button>
    </>
  );
}
