"use client";

import { LifeBuoy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendReport } from "@/lib/actions/profile";

export function ReportForm() {
  const t = useTranslations("profile");
  const te = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open)
    return (
      <Button variant="outline" className="w-full justify-start" onClick={() => setOpen(true)}>
        <LifeBuoy aria-hidden />
        {t("help")}
      </Button>
    );
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await sendReport(text);
        setBusy(false);
        if (!res.ok) return toast(te(res.error));
        toast(t("reportSent"));
        setText("");
        setOpen(false);
      }}
    >
      <label htmlFor="report" className="font-semibold">
        {t("help")}
      </label>
      <textarea
        id="report"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("reportPlaceholder")}
        rows={4}
        maxLength={2000}
        className="rounded-2xl border border-input bg-card p-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <Button type="submit" loading={busy} disabled={!text.trim()}>
        {t("send")}
      </Button>
    </form>
  );
}
