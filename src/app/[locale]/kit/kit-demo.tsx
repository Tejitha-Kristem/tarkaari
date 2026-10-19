"use client";

import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { BottomBar } from "@/components/bottom-bar";
import { ConfirmButton } from "@/components/confirm-button";
import { BookingBanner } from "@/components/booking-banner";
import { ProductTile } from "@/components/product-tile";
import { ReadAloudButton } from "@/components/read-aloud-button";
import { StatusMark } from "@/components/status-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUndo } from "@/hooks/use-undo";
import { Link } from "@/i18n/navigation";

const demoItems = [
  { slug: "tomato", photo: "/veg/tomato.webp", en: "Tomato", kn: "ಟೊಮೇಟೊ", unit: "kg", step: 0.25, min: 30, max: 40, tag: "morning_market" },
  { slug: "coriander", photo: "/veg/coriander.webp", en: "Coriander leaves", kn: "ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು", unit: "bunch", step: 1, min: 10, max: 15, tag: "farm_fresh" },
  { slug: "ginger", photo: "/veg/ginger.svg", en: "Ginger", kn: "ಶುಂಠಿ", unit: "g", step: 100, min: 12, max: 15, tag: null },
] as const;

export function KitDemo({ serverNow }: { serverNow: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const undo = useUndo();
  const [qty, setQty] = useState<Record<string, number>>({ tomato: 1, coriander: 0, ginger: 0 });
  const [ticked, setTicked] = useState<Record<string, boolean>>({ tomato: true, coriander: true, ginger: false });

  const name = (i: (typeof demoItems)[number]) => (locale === "kn" ? i.kn : i.en);

  function untick(slug: string, itemName: string) {
    setTicked((s) => ({ ...s, [slug]: false }));
    undo({
      message: t("a11y.removed", { item: itemName }),
      undo: () => setTicked((s) => ({ ...s, [slug]: true })),
    });
  }

  return (
    <>
      <AppHeader
        title={t("kit.title")}
        start={
          <Button asChild variant="ghost" size="icon" aria-label={t("common.back")}>
            <Link href="/">
              <ArrowLeft aria-hidden />
            </Link>
          </Button>
        }
      />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 pt-4 pb-36">
        <p className="text-muted-foreground">{t("kit.intro")}</p>

        <BookingBanner serverNow={serverNow} />

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("kit.stepper")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {demoItems.map((i) => (
              <ProductTile
                key={i.slug}
                item={{
                  name: name(i),
                  altName: locale === "kn" ? i.en : i.kn,
                  photo: i.photo,
                  unit: i.unit,
                  step: i.step,
                  priceMin: i.min,
                  priceMax: i.max,
                  reasonTag: i.tag,
                }}
                qty={qty[i.slug]}
                onQtyChange={(v) => setQty((s) => ({ ...s, [i.slug]: v }))}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("kit.status")}</h2>
          <Card className="flex-row flex-wrap gap-6">
            <StatusMark available />
            <StatusMark available={false} />
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("kit.undoDemo")}</h2>
          <Card className="gap-0 divide-y p-0">
            {demoItems.map((i) => (
              <div key={i.slug} className="flex items-center gap-3 p-3">
                <Image src={i.photo} alt="" width={56} height={56} className="size-14 rounded-xl bg-muted object-cover" />
                <span className="flex-1 font-semibold">{name(i)}</span>
                {ticked[i.slug] ? (
                  <button
                    type="button"
                    onClick={() => untick(i.slug, name(i))}
                    className="flex h-14 items-center rounded-xl px-2 active:bg-muted"
                  >
                    <StatusMark available />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTicked((s) => ({ ...s, [i.slug]: true }))}
                    className="flex h-14 items-center rounded-xl px-2 active:bg-muted"
                  >
                    <StatusMark available={false} />
                  </button>
                )}
              </div>
            ))}
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("kit.confirmDemo")}</h2>
          <ConfirmButton
            trigger={
              <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/5">
                <Trash2 aria-hidden />
                {t("kit.cancelOrder")}
              </Button>
            }
            title={t("kit.cancelOrderQuestion")}
            confirmLabel={t("kit.cancelOrder")}
            cancelLabel={t("kit.keepOrder")}
            onConfirm={() => toast(t("kit.orderCancelled"))}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("kit.readAloudDemo")}</h2>
          <Card>
            <p>{t("kit.readAloudText")}</p>
            <ReadAloudButton text={t("kit.readAloudText")} />
          </Card>
        </section>
      </main>

      <BottomBar>
        <Button size="lg" className="w-full">
          <ShoppingCart aria-hidden />
          {t("kit.mainAction")}
        </Button>
      </BottomBar>
    </>
  );
}
