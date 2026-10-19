import { Link } from "@/i18n/navigation";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Two big chips to switch a vendor screen between today's and tomorrow's deliveries. */
export function DateTabs({
  path,
  which,
  today,
  next,
  labels,
  locale,
  extra = "",
}: {
  path: string;
  which: "today" | "next";
  today: string;
  next: string;
  labels: { today: string; next: string };
  locale: string;
  extra?: string;
}) {
  const tabs = [
    { key: "today", label: labels.today, date: today },
    { key: "next", label: labels.next, date: next },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2 rounded-full bg-card p-1 shadow-card" role="tablist">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          role="tab"
          aria-selected={which === tab.key}
          href={`${path}?d=${tab.key}${extra}`}
          replace
          className={cn(
            "flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold",
            which === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {tab.label}
          <span className={cn("font-normal", which === tab.key ? "text-on-dark-muted" : "")}>
            {shortDate(tab.date, locale, { day: "numeric", month: "short" })}
          </span>
        </Link>
      ))}
    </div>
  );
}
