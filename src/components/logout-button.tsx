"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/profile";

export function LogoutButton() {
  const t = useTranslations();
  return (
    <ConfirmButton
      trigger={
        <Button variant="ghost" className="w-full">
          <LogOut aria-hidden />
          {t("profile.logout")}
        </Button>
      }
      title={t("profile.logoutQ")}
      confirmLabel={t("profile.logout")}
      cancelLabel={t("common.cancel")}
      onConfirm={async () => {
        await signOut();
        window.location.href = "/";
      }}
    />
  );
}
