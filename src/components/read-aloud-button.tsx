"use client";

import { Square, Volume2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const speechLang = { en: "en-IN", kn: "kn-IN" } as const;

function pickVoice(lang: string) {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split("-")[0];
  return (
    voices.find((v) => v.lang.replace("_", "-") === lang) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ??
    null
  );
}

/** Speaks `text` with the browser's speech engine, in the current UI language. */
export function ReadAloudButton({ text, className }: { text: string; className?: string }) {
  const locale = useLocale();
  const t = useTranslations("a11y");
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    // Voice lists load asynchronously on Android Chrome; warm them up.
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, []);

  function toggle() {
    if (!("speechSynthesis" in window)) {
      toast(t("readAloudUnsupported"));
      return;
    }
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const lang = speechLang[locale];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  }

  return (
    <Button variant="outline" onClick={toggle} aria-pressed={speaking} className={cn("w-full", className)}>
      {speaking ? <Square aria-hidden /> : <Volume2 aria-hidden />}
      {speaking ? t("stopReading") : t("readAloud")}
    </Button>
  );
}
