"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { QtyStepper } from "@/components/qty-stepper";
import type { Enums } from "@/types/database";

export type ProductTileItem = {
  /** Name in the current language (shown large). */
  name: string;
  /** Name in the other language (shown small), so mixed households can both read it. */
  altName?: string;
  photo: string;
  unit: Enums<"item_unit">;
  step: number;
  priceMin: number;
  priceMax: number;
  reasonTag?: Enums<"reason_tag"> | null;
};

/** Photo-first shop tile: picture, name, price range per unit, Add / − qty +. */
export function ProductTile({
  item,
  qty,
  onQtyChange,
  disabled,
}: {
  item: ProductTileItem;
  qty: number;
  onQtyChange: (qty: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const unitLabel = t(`units.${item.unit}`);
  const priceUnit = item.unit === "g" ? `100 ${unitLabel}` : unitLabel;

  return (
    <div className="flex flex-col rounded-[1.25rem] border bg-card p-2 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        <Image src={item.photo} alt="" fill sizes="(max-width: 512px) 50vw, 240px" className="object-cover" />
      </div>
      <div className="flex flex-1 flex-col px-1 pt-2 pb-2">
        <p className="text-base leading-tight font-bold">{item.name}</p>
        {item.altName && <p className="text-sm leading-snug text-muted-foreground">{item.altName}</p>}
        <p className="mt-auto pt-1 text-base font-extrabold">
          {t("common.priceRange", { min: item.priceMin, max: item.priceMax })}
          <span className="text-sm font-medium whitespace-nowrap text-muted-foreground"> / {priceUnit}</span>
        </p>
        {item.reasonTag && (
          <p className="text-sm leading-snug font-semibold text-accent-foreground">{t(`reasonTags.${item.reasonTag}`)}</p>
        )}
      </div>
      <QtyStepper
        value={qty}
        step={item.step}
        onChange={onQtyChange}
        unitLabel={unitLabel}
        itemName={item.name}
        max={item.unit === "g" ? 2000 : 20}
        disabled={disabled}
      />
    </div>
  );
}
