"use client";

import { Clock, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { bookingState, istInstant } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Shows whether tomorrow's booking is open. Display only: the database
 * enforces the window when orders are written.
 * `serverNow` keeps the first client render identical to the server's.
 */
export function BookingBanner({ serverNow, className }: { serverNow: number; className?: string }) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const state = bookingState(new Date(now));
  // Indian date order ("Tuesday, 20 Oct"), in IST.
  const date = new Intl.DateTimeFormat(locale === "kn" ? "kn-IN" : "en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(istInstant(state.deliveryDate, { hour: 12, minute: 0 }));

  if (state.phase === "open" && state.closesAt) {
    const mins = Math.max(0, Math.ceil((state.closesAt.getTime() - now) / 60_000));
    return (
      <div role="status" className={cn("flex items-center gap-3 rounded-[1.25rem] bg-accent p-4", className)}>
        <span className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-base font-extrabold text-primary-foreground tabular-nums">
          {t("timeLeft", { hours: Math.floor(mins / 60), minutes: mins % 60 })}
        </span>
        {/* Date text may differ between server and browser date data; the browser's wins. */}
        <p suppressHydrationWarning className="font-semibold leading-snug">
          {t("open", { date })}
        </p>
      </div>
    );
  }

  const Icon = state.phase === "locked" ? Lock : Clock;
  return (
    <div role="status" className={cn("flex items-center gap-3 rounded-[1.25rem] bg-secondary p-4", className)}>
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
        <Icon className="size-6" />
      </span>
      <p suppressHydrationWarning className="font-semibold leading-snug">
        {state.phase === "locked" ? t("locked", { date }) : t("notYetOpen", { date })}
      </p>
    </div>
  );
}
