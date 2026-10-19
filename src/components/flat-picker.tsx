"use client";

import { Delete } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const BLOCKS = ["A", "B", "C", "D", "E", "F", "G", "H", "1", "2", "3", "4"];

/** Block chips and a big number pad: no keyboard needed. */
export function FlatPicker({
  block,
  flat,
  onBlock,
  onFlat,
}: {
  block: string | null;
  flat: string;
  onBlock: (b: string | null) => void;
  onFlat: (f: string) => void;
}) {
  const t = useTranslations("onboarding");
  const chip = (on: boolean) =>
    cn("h-12 rounded-2xl text-lg font-semibold", on ? "bg-primary text-primary-foreground" : "bg-card shadow-card");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t("block")}</span>
        <div className="grid grid-cols-6 gap-2">
          {BLOCKS.map((b) => (
            <button key={b} type="button" aria-pressed={block === b} onClick={() => onBlock(b)} className={chip(block === b)}>
              {b}
            </button>
          ))}
        </div>
        <button type="button" aria-pressed={block === null} onClick={() => onBlock(null)} className={cn(chip(block === null), "text-base")}>
          {t("noBlock")}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t("flatNo")}</span>
        <output className="flex h-16 items-center rounded-2xl border-2 border-primary bg-card px-4 text-3xl font-semibold tracking-widest">
          {block ? `${block}-` : ""}
          {flat || <span className="text-input">101</span>}
        </output>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} type="button" onClick={() => flat.length < 6 && onFlat(flat + d)} className="h-14 rounded-2xl bg-card text-2xl font-semibold shadow-card active:bg-secondary">
              {d}
            </button>
          ))}
          <span />
          <button type="button" onClick={() => flat.length < 6 && onFlat(flat + "0")} className="h-14 rounded-2xl bg-card text-2xl font-semibold shadow-card active:bg-secondary">
            0
          </button>
          <button
            type="button"
            aria-label={t("deleteDigit")}
            onClick={() => onFlat(flat.slice(0, -1))}
            className="flex h-14 items-center justify-center rounded-2xl bg-secondary active:bg-muted"
          >
            <Delete className="size-6" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
