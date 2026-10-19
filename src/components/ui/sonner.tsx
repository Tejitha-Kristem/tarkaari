"use client";

import type * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// Toasts sit just above the bottom action bar and use large text.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      offset={{ bottom: 104 }}
      mobileOffset={{ bottom: 104 }}
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !text-base !p-4 !gap-3 !border-2",
          actionButton: "!h-12 !px-4 !text-base !font-semibold !rounded-xl",
        },
      }}
      style={
        {
          "--normal-bg": "var(--foreground)",
          "--normal-text": "var(--background)",
          "--normal-border": "var(--foreground)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
