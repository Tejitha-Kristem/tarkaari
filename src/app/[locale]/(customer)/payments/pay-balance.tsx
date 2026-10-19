"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { claimPayment } from "@/lib/actions/orders";
import { rupees } from "@/lib/format";

/** Pay the whole outstanding balance (monthly customers, or several bills at once). */
export function PayBalance({ amount, upiId, shopName }: { amount: number; upiId: string | null; shopName: string }) {
  const t = useTranslations("bill");
  const te = useTranslations("errors");
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);

  async function claim(method: "upi" | "cash") {
    setBusy(true);
    const res = await claimPayment(amount, method);
    setBusy(false);
    if (!res.ok) return toast(te(res.error));
    router.refresh();
  }

  const upiLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent("Tarkaari")}`
    : null;

  return (
    <div className="flex flex-col gap-2 rounded-[1.375rem] bg-card p-4 shadow-card">
      {upiLink && !opened ? (
        <Button asChild size="lg">
          <a href={upiLink} onClick={() => setTimeout(() => setOpened(true), 800)}>
            {t("payUpi", { amount: rupees(amount) })}
          </a>
        </Button>
      ) : (
        upiId && (
          <>
            <p className="text-sm text-muted-foreground">{t("upiHelp", { upi: upiId })}</p>
            <Button size="lg" disabled={busy} onClick={() => claim("upi")}>
              {t("iPaid")}
            </Button>
          </>
        )
      )}
      <Button variant="outline" disabled={busy} onClick={() => claim("cash")}>
        {t("paidCash")}
      </Button>
    </div>
  );
}
