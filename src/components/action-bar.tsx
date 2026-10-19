import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The ONE main action of a screen, fixed at the bottom within thumb reach.
 * `aboveNav` lifts it over the bottom navigation. Pages using it need bottom
 * padding (pb-44 with nav, pb-28 without).
 */
export function ActionBar({ children, aboveNav = false, className }: { children: ReactNode; aboveNav?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 mx-auto max-w-lg px-4",
        aboveNav ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))]" : "bottom-0 bg-background/95 pt-3 pb-safe backdrop-blur",
      )}
    >
      <div className={cn("flex flex-col gap-2", className)}>{children}</div>
    </div>
  );
}
