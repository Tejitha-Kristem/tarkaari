"use client";

import { Lock, Timer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { BookingInfo } from "@/lib/types";

export function LockCountdown({ booking, nextLabel }: { booking: BookingInfo; nextLabel: string }) {
  const t = useTranslations();
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setOffset(Date.now() - started), 30_000);
    return () => clearInterval(id);
  }, []);

  if (booking.phase === "open" && booking.closesAt) {
    const mins = Math.max(0, Math.ceil((new Date(booking.closesAt).getTime() - booking.now - offset) / 60_000));
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3" role="status">
        <Timer className="size-6 text-accent" aria-hidden />
        <div className="flex-1">
          <p className="text-sm text-on-dark-muted">{t("vendor.locksIn")}</p>
          <p className="text-xl font-bold tabular-nums">
            {t("booking.timeLeft", { hours: Math.floor(mins / 60), minutes: mins % 60 })}
            <span className="ml-2 text-sm font-normal text-on-dark-muted">{t("vendor.at5")}</span>
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3" role="status">
      <Lock className="size-5 text-accent" aria-hidden />
      <p className="font-semibold" suppressHydrationWarning>
        {booking.phase === "locked" ? t("vendor.locked", { date: nextLabel }) : t("vendor.opensAt")}
      </p>
    </div>
  );
}
