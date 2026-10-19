"use client";

import { Mic, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Big "Tap and speak" button: appends what it hears (English or Kannada) to the list. */
export function SpeechButton({ onText, className }: { onText: (text: string) => void; className?: string }) {
  const t = useTranslations("list");
  const locale = useLocale();
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => () => rec.current?.stop(), []);

  function toggle() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const R = getRecognition();
    if (!R) {
      toast(t("micUnsupported"));
      return;
    }
    const r = new R();
    r.lang = locale === "kn" ? "kn-IN" : "en-IN";
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (e) => {
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript);
      onText(parts.join(", "));
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") toast(t("micDenied"));
    };
    r.onend = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={listening}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-2.5 rounded-full text-lg font-semibold active:scale-[0.99]",
        listening ? "bg-urgent text-white shadow-[0_0_0_6px_rgb(194_54_28/0.18)]" : "border-2 border-primary bg-card text-primary",
        className,
      )}
    >
      {listening ? <Square className="size-5" aria-hidden /> : <Mic className="size-6" aria-hidden />}
      {listening ? t("listening") : t("speak")}
    </button>
  );
}
