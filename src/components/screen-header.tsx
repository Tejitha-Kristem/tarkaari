import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LanguageSwitch } from "@/components/language-switch";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Curved forest-green header used on the main tab screens. */
export function GreenHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-col gap-4 rounded-b-[1.875rem] bg-primary px-4 pt-4 pb-5 text-primary-foreground", className)}>
      {children}
    </header>
  );
}

/** White header for inner screens: back, title, language. */
export async function SubHeader({ title, back, end }: { title: ReactNode; back?: string; end?: ReactNode }) {
  const t = await getTranslations("common");
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-4 py-3 backdrop-blur">
      {back && (
        <Link
          href={back}
          aria-label={t("back")}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card shadow-card"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
      )}
      <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">{title}</h1>
      {end ?? <LanguageSwitch />}
    </header>
  );
}
