"use client";

import { Clock, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { istInstant } from "@/lib/time";
import type { BookingInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Time left to order, as text AND a draining bar. Display only; the database enforces the window. */
export function BookingStrip({ booking, className }: { booking: BookingInfo; className?: string }) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setOffset(Date.now() - started), 30_000);
    return () => clearInterval(id);
  }, []);

  const now = booking.now + offset;
  const date = new Intl.DateTimeFormat(locale === "kn" ? "kn-IN" : "en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(istInstant(booking.deliveryDate, { hour: 12, minute: 0 }));

  if (booking.phase === "open" && booking.closesAt) {
    const closes = new Date(booking.closesAt).getTime();
    const mins = Math.max(0, Math.ceil((closes - now) / 60_000));
    const fraction = Math.min(1, Math.max(0, mins / (7 * 60)));
    return (
      <div role="status" className={cn("flex items-center gap-3 rounded-[1.25rem] bg-card p-3 shadow-card", className)}>
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-urgent-soft text-urgent">
          <Clock className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span suppressHydrationWarning className="text-sm leading-snug font-semibold">
              {t("orderBy", { date })}
            </span>
            <span className="shrink-0 font-bold text-urgent tabular-nums">
              {t("timeLeft", { hours: Math.floor(mins / 60), minutes: mins % 60 })}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-urgent" style={{ width: `${fraction * 100}%` }} />
          </div>
        </div>
      </div>
    );
  }

  const Icon = booking.phase === "locked" ? Lock : Clock;
  return (
    <div role="status" className={cn("flex items-center gap-3 rounded-[1.25rem] bg-card p-3 shadow-card", className)}>
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-accent">
        <Icon className="size-5" />
      </span>
      <p suppressHydrationWarning className="text-sm leading-snug font-semibold">
        {booking.phase === "locked" ? t("locked", { date }) : t("notYetOpen", { date })}
      </p>
    </div>
  );
}
