"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AdminAction } from "@/components/admin-action";
import { Button } from "@/components/ui/button";
import { mergeApartments } from "@/lib/actions/admin";

export function MergeApartment({ from, options }: { from: { id: string; label: string }; options: { id: string; label: string }[] }) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  const [into, setInto] = useState("");
  if (!open)
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {t("merge")}
      </Button>
    );
  const target = options.find((o) => o.id === into);
  return (
    <div className="flex w-full flex-col gap-2">
      <select
        value={into}
        onChange={(e) => setInto(e.target.value)}
        aria-label={t("merge")}
        className="h-12 rounded-2xl border border-input bg-card px-3 text-base"
      >
        <option value="">{t("merge")}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          ✕
        </Button>
        {target && (
          <AdminAction variant="default" run={() => mergeApartments(from.id, target.id)} confirm={t("mergeQ", { from: from.label, into: target.label })}>
            {t("merge")}
          </AdminAction>
        )}
      </div>
    </div>
  );
}
