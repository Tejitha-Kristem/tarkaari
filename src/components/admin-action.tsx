"use client";

import { useTranslations } from "next-intl";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/errors";

/** One admin button: runs a server action, optionally behind a confirmation sheet. */
export function AdminAction({
  run,
  children,
  confirm,
  variant = "secondary",
}: {
  run: () => Promise<ActionResult>;
  children: ReactNode;
  confirm?: string;
  variant?: "default" | "secondary" | "outline" | "outline-danger" | "dark";
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = () =>
    start(async () => {
      const res = await run();
      if (!res.ok) return void toast(t(`errors.${res.error}`));
      toast(t("admin.done"));
      router.refresh();
    });
  const button = (
    <Button size="sm" variant={variant} disabled={pending} onClick={confirm ? undefined : go}>
      {children}
    </Button>
  );
  if (!confirm) return button;
  return <ConfirmButton trigger={button} title={confirm} confirmLabel={children} cancelLabel={t("common.cancel")} onConfirm={go} />;
}
