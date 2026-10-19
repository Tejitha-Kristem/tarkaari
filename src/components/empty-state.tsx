import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, body, children }: { icon: LucideIcon; title: ReactNode; body?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.375rem] bg-card px-6 py-10 text-center shadow-card">
      <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-mint text-primary">
        <Icon className="size-7" />
      </span>
      <p className="text-lg font-semibold">{title}</p>
      {body && <p className="text-sm text-muted-foreground">{body}</p>}
      {children}
    </div>
  );
}
