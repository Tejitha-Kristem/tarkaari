import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Availability shown by colour AND shape AND word: green tick circle / red cross square. */
export function StatusMark({ available, showLabel = true, className }: { available: boolean; showLabel?: boolean; className?: string }) {
  const t = useTranslations("a11y");
  const label = available ? t("available") : t("notAvailable");
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", available ? "text-success" : "text-destructive", className)}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center text-white",
          available ? "rounded-full bg-success" : "rounded-md bg-destructive",
        )}
      >
        {available ? <Check className="size-4" strokeWidth={3.5} /> : <X className="size-4" strokeWidth={3.5} />}
      </span>
      {showLabel && <span aria-hidden>{label}</span>}
    </span>
  );
}
