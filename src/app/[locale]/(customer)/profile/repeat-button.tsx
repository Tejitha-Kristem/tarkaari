"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCustomerCart } from "@/components/customer-shell";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

/** Put a past order's still-available items into the cart and open it. */
export function RepeatButton({ items }: { items: [string, number][] }) {
  const t = useTranslations("profile");
  const router = useRouter();
  const { replace } = useCustomerCart();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={items.length === 0}
      onClick={() => {
        replace(Object.fromEntries(items));
        router.push("/cart");
      }}
    >
      <RotateCcw aria-hidden />
      {t("repeat")}
    </Button>
  );
}
