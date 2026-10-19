"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { useCustomerCart } from "@/components/customer-shell";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { cancelOrder } from "@/lib/actions/orders";

export function CancelOrderButton({ orderId, dateLabel }: { orderId: string; dateLabel: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { reset } = useCustomerCart();
  return (
    <ConfirmButton
      trigger={<Button variant="outline-danger">{t("order.cancel")}</Button>}
      title={t("order.cancelQ", { date: dateLabel })}
      confirmLabel={t("order.cancel")}
      cancelLabel={t("order.keep")}
      onConfirm={async () => {
        const res = await cancelOrder(orderId);
        if (!res.ok) {
          toast(t(`errors.${res.error}`));
          return;
        }
        reset();
        toast(t("order.cancelled"));
        router.refresh();
      }}
    />
  );
}
