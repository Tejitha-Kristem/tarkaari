"use client";

import { HandHeart, Leaf, Recycle, Store, Timer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SEEN_KEY = "tarkaari:intro-seen";
export const OPEN_INTRO = "tarkaari:open-intro";

const SLIDES = [
  {
    key: "fresh",
    art: (
      <div className="relative size-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- local photo */}
        <img src="/veg/tomato.webp" alt="" className="size-full rounded-[2rem] object-cover" />
        <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-raised">
          <Timer className="size-5 text-accent" aria-hidden /> 5:00 pm
        </span>
      </div>
    ),
  },
  {
    key: "local",
    art: (
      <div className="flex size-full items-center justify-center rounded-[2rem] bg-peach">
        <div className="relative">
          <span className="flex size-36 items-center justify-center rounded-full bg-card shadow-raised">
            <Store className="size-16 text-primary" aria-hidden />
          </span>
          <span className="absolute -right-4 -bottom-2 flex size-16 items-center justify-center rounded-full bg-accent shadow-raised">
            <HandHeart className="size-8 text-accent-foreground" aria-hidden />
          </span>
        </div>
      </div>
    ),
  },
  {
    key: "eco",
    art: (
      <div className="flex size-full items-center justify-center rounded-[2rem] bg-mint">
        <div className="relative">
          <span className="flex size-36 items-center justify-center rounded-full bg-card shadow-raised">
            <Leaf className="size-16 text-primary" aria-hidden />
          </span>
          <span className="absolute -bottom-2 -left-4 flex size-16 items-center justify-center rounded-full bg-primary shadow-raised">
            <Recycle className="size-8 text-accent" aria-hidden />
          </span>
        </div>
      </div>
    ),
  },
] as const;

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || !!nav.standalone;
}

/**
 * Three swipeable intro pages. Opens by itself the first time the installed app
 * is launched, and from "How it works" on the welcome screen.
 */
export function IntroSlides() {
  const t = useTranslations("intro");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first launch is only knowable in the browser
    if (!seen && isStandalone()) setOpen(true);
    const show = () => (setIndex(0), setOpen(true));
    addEventListener(OPEN_INTRO, show);
    return () => removeEventListener(OPEN_INTRO, show);
  }, []);

  if (!open) return null;

  function close() {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setOpen(false);
  }
  function go(i: number) {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }
  const last = index === SLIDES.length - 1;

  return (
    <div role="dialog" aria-modal="true" aria-label={t("label")} className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pt-4">
        <button type="button" onClick={close} className="h-11 rounded-full px-3 font-semibold text-muted-foreground">
          {t("skip")}
        </button>
        <LanguageSwitch />
      </div>
      <div
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="mx-auto flex w-full max-w-lg flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((s, i) => (
          <section key={s.key} aria-hidden={i !== index} className="flex w-full shrink-0 snap-center flex-col gap-6 px-6 pt-4">
            <div className="h-[44dvh] min-h-56">{s.art}</div>
            <div className="flex flex-col gap-3">
              <h2 className="text-[1.75rem] leading-tight font-semibold text-balance">{t(`${s.key}Title`)}</h2>
              <p className="text-lg leading-relaxed text-muted-foreground">{t(`${s.key}Body`)}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-center gap-2" aria-hidden>
          {SLIDES.map((s, i) => (
            <span key={s.key} className={cn("h-2.5 rounded-full transition-all", i === index ? "w-7 bg-primary" : "w-2.5 bg-[#cdd8d2]")} />
          ))}
        </div>
        <Button size="lg" className="w-full" onClick={() => (last ? close() : go(index + 1))}>
          {last ? t("start") : t("next")}
        </Button>
      </div>
    </div>
  );
}

/** "How it works" link that opens the intro again. */
export function IntroLink({ className }: { className?: string }) {
  const t = useTranslations("intro");
  return (
    <button type="button" onClick={() => dispatchEvent(new Event(OPEN_INTRO))} className={className}>
      {t("howItWorks")}
    </button>
  );
}
