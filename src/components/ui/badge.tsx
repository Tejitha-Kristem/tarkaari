import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-accent",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-mint text-[#0f5c2b]",
        warning: "bg-peach text-[#7a4a12]",
        urgent: "bg-urgent-soft text-urgent",
        info: "bg-[#e8eefc] text-[#1e3a8a]",
        outline: "border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
