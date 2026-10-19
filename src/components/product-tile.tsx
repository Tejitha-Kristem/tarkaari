"use client";

import { useTranslations } from "next-intl";
import { QtyStepper } from "@/components/qty-stepper";
import { VegImage } from "@/components/veg-image";
import { formatRange, perUnitLabel } from "@/lib/format";
import type { ShopItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Photo-first shop card: picture on a pastel tile, name, price range, Add / − qty +. */
export function ProductTile({
  item,
  qty,
  onQtyChange,
  disabled,
}: {
  item: ShopItem;
  qty: number;
  onQtyChange: (qty: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const unitLabel = t(`units.${item.unit}`);

  return (
    <div className="flex flex-col rounded-[1.375rem] bg-card p-2 shadow-card">
      <div className="relative">
        <VegImage
          photo={item.photo}
          category={item.category}
          className={cn(
            "aspect-square rounded-2xl",
            !item.available && "opacity-45 grayscale",
          )}
        />
        {!item.available && (
          <span className="absolute inset-x-2 bottom-2 rounded-full bg-card/95 py-1 text-center text-xs font-semibold text-urgent">
            {t("bill.notAvailable")}
          </span>
        )}
        {item.reasonTag && (
          <span className="absolute top-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-accent">
            {t(`reasonTags.${item.reasonTag}`)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-1 pt-2.5 pb-2.5">
        <p className="text-base leading-tight font-semibold">{item.name}</p>
        <p className="text-sm text-muted-foreground">{item.altName}</p>
        <p className="mt-auto pt-1.5 text-base font-semibold">
          {formatRange(item.priceMin, item.priceMax)}
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            / {perUnitLabel(item.unit, unitLabel, t("units.g"))}
          </span>
        </p>
      </div>
      {item.available ? (
        <QtyStepper
          value={qty}
          step={item.step}
          unitLabel={unitLabel}
          itemName={item.name}
          max={item.unit === "g" ? 5000 : 50}
          onChange={onQtyChange}
          disabled={disabled}
        />
      ) : (
        <div className="flex h-11 items-center justify-center rounded-full bg-secondary text-sm text-muted-foreground">
          {t("bill.notAvailable")}
        </div>
      )}
    </div>
  );
}
