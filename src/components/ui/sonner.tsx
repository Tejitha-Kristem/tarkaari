"use client";

import type * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// Toasts sit just above the bottom action bar and use large text.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      offset={{ bottom: 120 }}
      mobileOffset={{ bottom: 120 }}
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !text-base !p-4 !gap-3 !border-0 !shadow-raised",
          actionButton: "!h-11 !px-4 !text-base !font-semibold !rounded-full !bg-accent !text-accent-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "var(--primary)",
          "--normal-text": "var(--background)",
          "--normal-border": "var(--primary)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
