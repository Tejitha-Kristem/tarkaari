import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-13 w-full min-w-0 rounded-2xl border-2 border-input bg-card px-4 text-lg outline-none placeholder:text-muted-foreground disabled:opacity-50 focus-visible:border-primary aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
