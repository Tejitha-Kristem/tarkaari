"use client";

import { Building2, Check, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addApartment } from "@/lib/actions/onboarding";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type PickedApartment = { id: string; name: string; area: string };

/** Search first, add if not found. New apartments go live immediately. */
export function ApartmentPicker({ value, onPick }: { value: PickedApartment | null; onPick: (a: PickedApartment) => void }) {
  const t = useTranslations();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickedApartment[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      const { data } = await createClient().rpc("search_apartments", { p_query: query, p_limit: 12 });
      if (!cancelled) setResults((data ?? []).map((a) => ({ id: a.id, name: a.name, area: a.area })));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q]);
  const shown = q.trim().length < 2 ? [] : results;

  async function create() {
    setBusy(true);
    setError(null);
    const res = await addApartment(name, area);
    setBusy(false);
    if (!res.ok) {
      setError(t(`errors.${res.error}`));
      return;
    }
    onPick({ id: res.data.id, name: res.data.name, area: res.data.area });
  }

  if (adding) {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{t("onboarding.aptName")}</span>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{t("onboarding.aptArea")}</span>
          <Input value={area} onChange={(e) => setArea(e.target.value)} maxLength={120} />
        </label>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <Button size="lg" disabled={busy || name.trim().length < 2 || area.trim().length < 2} onClick={create}>
          {t("onboarding.aptCreate")}
        </Button>
        <Button variant="ghost" onClick={() => setAdding(false)}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex h-14 items-center gap-3 rounded-full border-2 border-input bg-card px-4 focus-within:border-primary">
        <Search className="size-5 text-muted-foreground" aria-hidden />
        <span className="sr-only">{t("onboarding.aptSearch")}</span>
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("onboarding.aptSearch")}
          className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
        />
      </label>
      <ul className="flex flex-col gap-2">
        {shown.map((a) => {
          const on = value?.id === a.id;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onPick(a)}
                aria-pressed={on}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl p-3 text-left",
                  on ? "bg-primary text-primary-foreground" : "bg-card shadow-card",
                )}
              >
                <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", on ? "bg-white/15" : "bg-mint text-primary")}>
                  {on ? <Check className="size-5" /> : <Building2 className="size-5" />}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{a.name}</span>
                  <span className={cn("truncate text-sm", on ? "text-on-dark-muted" : "text-muted-foreground")}>{a.area}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {q.trim().length >= 2 && (
        <div className="flex flex-col items-start gap-1 pt-1">
          <span className="text-sm text-muted-foreground">{t("onboarding.aptNotFound")}</span>
          <Button
            variant="outline"
            onClick={() => {
              setName(q.trim());
              setAdding(true);
            }}
          >
            <Plus aria-hidden />
            {t("onboarding.addApt")}
          </Button>
        </div>
      )}
    </div>
  );
}
