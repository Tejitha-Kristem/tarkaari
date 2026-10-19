"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { setVendor } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string; sub: string };

export function VendorChooser({ current, options }: { current: string | null; options: Option[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(!current);
  const [busy, setBusy] = useState(false);

  if (!open)
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("profile.changeVendor")}
      </Button>
    );
  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {options.map((o) => {
        const on = o.id === current;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={busy}
            onClick={async () => {
              if (on) return setOpen(false);
              setBusy(true);
              const res = await setVendor(o.id);
              setBusy(false);
              if (!res.ok) return toast(t(`errors.${res.error}`));
              toast(t("common.saved"));
              setOpen(false);
              router.refresh();
            }}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 text-left",
              on ? "bg-primary text-primary-foreground" : "bg-secondary",
            )}
          >
            <span
              aria-hidden
              className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", on ? "bg-accent text-accent-foreground" : "border-2 border-input")}
            >
              {on && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <span>
              <span className="block font-semibold">{o.name}</span>
              <span className={cn("text-sm", on ? "text-on-dark-muted" : "text-muted-foreground")}>{o.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
