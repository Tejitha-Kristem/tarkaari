"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar } from "@/components/action-bar";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { claimPayment } from "@/lib/actions/orders";
import { rupees } from "@/lib/format";

export function PayPanel({
  orderId,
  due,
  claimed,
  paid,
  monthly,
  upiId,
  shopName,
  note,
}: {
  orderId: string;
  total: number;
  due: number;
  claimed: boolean;
  paid: boolean;
  monthly: boolean;
  upiId: string | null;
  shopName: string;
  note: string;
}) {
  const t = useTranslations("bill");
  const te = useTranslations("errors");
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);

  async function claim(method: "upi" | "cash") {
    setBusy(true);
    const res = await claimPayment(due, method, orderId);
    setBusy(false);
    if (!res.ok) {
      toast(te(res.error));
      return;
    }
    router.refresh();
  }

  if (paid) {
    return (
      <p className="flex items-center gap-2 rounded-[1.25rem] bg-mint p-4 font-semibold text-[#0f5c2b]">
        <CheckCircle2 className="size-5" aria-hidden />
        {t("paid")}
      </p>
    );
  }
  if (claimed || due <= 0) {
    return (
      <p className="flex items-center gap-2 rounded-[1.25rem] bg-secondary p-4 font-semibold">
        <Clock className="size-5" aria-hidden />
        {t("claimed", { vendor: shopName })}
      </p>
    );
  }
  if (monthly) return <p className="rounded-[1.25rem] bg-butter p-4 font-semibold">{t("monthly")}</p>;

  const upiLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${due.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`
    : null;

  return (
    <>
      <p className="rounded-[1.25rem] bg-peach p-4 text-lg font-semibold text-[#6b4a1f]">{t("due", { amount: rupees(due) })}</p>
      {opened && upiId && <p className="text-sm text-muted-foreground">{t("upiHelp", { upi: upiId })}</p>}
      <ActionBar aboveNav>
        {upiLink && !opened && (
          <Button asChild size="lg" className="w-full shadow-raised">
            <a href={upiLink} onClick={() => setTimeout(() => setOpened(true), 800)}>
              {t("payUpi", { amount: rupees(due) })}
            </a>
          </Button>
        )}
        {(opened || !upiLink) && upiId && (
          <Button size="lg" className="w-full shadow-raised" loading={busy} onClick={() => claim("upi")}>
            {t("iPaid")}
          </Button>
        )}
        <Button variant="outline" className="w-full" loading={busy} onClick={() => claim("cash")}>
          {t("paidCash")}
        </Button>
      </ActionBar>
    </>
  );
}
