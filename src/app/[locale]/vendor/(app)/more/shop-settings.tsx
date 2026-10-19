"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { saveShop } from "@/lib/actions/vendor";

const UPI = /^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9]{2,64}$/;

export function ShopSettings({ shopName, upiId, serviceCharge }: { shopName: string; upiId: string; serviceCharge: number }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ shopName, upiId, charge: String(serviceCharge) });
  const dirty = form.shopName !== shopName || form.upiId !== upiId || Number(form.charge) !== serviceCharge;
  const badUpi = !!form.upiId.trim() && !UPI.test(form.upiId.trim());

  return (
    <form
      className="flex flex-col gap-3 rounded-[1.375rem] bg-card p-4 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveShop({ shop_name: form.shopName, upi_id: form.upiId, service_charge: Number(form.charge) || 0 });
          if (!res.ok) return void toast(t(`errors.${res.error}`));
          toast(t("common.saved"));
          router.refresh();
        });
      }}
    >
      <h2 className="text-lg font-semibold">{t("vendorMore.settings")}</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="shop">{t("vendorMore.shopName")}</Label>
        <Input id="shop" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="upi">{t("vendorMore.upiId")}</Label>
        <Input id="upi" value={form.upiId} placeholder={t("vendorSetup.upiHint")} aria-invalid={badUpi} onChange={(e) => setForm({ ...form, upiId: e.target.value })} />
        {badUpi && <p className="text-sm text-destructive">{t("vendorSetup.badUpi")}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="charge">{t("vendorMore.serviceCharge")} (₹)</Label>
        <Input id="charge" inputMode="numeric" value={form.charge} onChange={(e) => setForm({ ...form, charge: e.target.value.replace(/\D/g, "") })} />
      </div>
      <Button type="submit" loading={pending} disabled={!dirty || badUpi || !form.shopName.trim()}>
        {t("common.save")}
      </Button>
    </form>
  );
}
