import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Holds the ONE main action of a screen, fixed at the bottom within thumb reach.
 * Pages using it should add `pb-32` to their content so nothing hides behind it.
 */
export function BottomBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-background shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
      <div className={cn("mx-auto flex w-full max-w-lg flex-col gap-2 px-4 pt-3 pb-safe", className)}>{children}</div>
    </div>
  );
}
