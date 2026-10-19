import type { ReactNode } from "react";
import { LanguageSwitch } from "@/components/language-switch";

/** Top bar used on every screen: optional back control, title, language switch. */
export function AppHeader({ title, start }: { title: ReactNode; start?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-4 py-2 backdrop-blur">
      {start}
      <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{title}</h1>
      <LanguageSwitch />
    </header>
  );
}
