import { HandHeart, Leaf, Recycle, Sunrise } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "eco", icon: Leaf, tint: "bg-mint" },
  { key: "fresh", icon: Sunrise, tint: "bg-butter" },
  { key: "local", icon: HandHeart, tint: "bg-peach" },
  { key: "waste", icon: Recycle, tint: "bg-lilac" },
] as const;

/** Why buy through Tarkaari: shown on the welcome screen and the WhatsApp join page. */
export async function Benefits({ className }: { className?: string }) {
  const t = await getTranslations("benefits");
  return (
    <section aria-labelledby="benefits" className={cn("flex flex-col gap-3", className)}>
      <h2 id="benefits" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {ITEMS.map(({ key, icon: Icon, tint }) => (
          <li key={key} className={cn("flex flex-col gap-2 rounded-[1.375rem] p-4", tint)}>
            <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-card text-primary">
              <Icon className="size-5" />
            </span>
            <span className="leading-tight font-semibold">{t(`${key}Title`)}</span>
            <span className="text-sm leading-snug text-[#3d4f48]">{t(`${key}Body`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
