"use client";

import { Download, EllipsisVertical, Share, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
declare global {
  interface Window {
    __installPrompt?: InstallPrompt | null;
  }
}

/**
 * Chrome fires `beforeinstallprompt` once, often before React hydrates, so
 * INSTALL_CAPTURE (inlined in the root layout) stores it on window and this
 * hook reads it from there.
 */
export const INSTALL_CAPTURE = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installPrompt=e;dispatchEvent(new Event("installchange"))});addEventListener("appinstalled",function(){window.__installPrompt=null;dispatchEvent(new Event("installchange"))});`;

type Mode = "standalone" | "prompt" | "ios" | "menu";

function readMode(): Mode {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) return "standalone";
  if (window.__installPrompt) return "prompt";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "menu";
}

function subscribe(cb: () => void) {
  addEventListener("installchange", cb);
  return () => removeEventListener("installchange", cb);
}

const HIDE_KEY = "tarakari:install-hidden";

/** "Install app" card: one-tap install on Android, Share → Add to Home Screen steps on iPhone. */
export function InstallApp({ variant = "banner", className }: { variant?: "banner" | "row"; className?: string }) {
  const t = useTranslations("app");
  const mode = useSyncExternalStore(subscribe, readMode, () => "standalone" as Mode);
  const [hidden, setHidden] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  if (installed || mode === "standalone" || (variant === "banner" && hidden)) return null;

  async function install() {
    const prompt = window.__installPrompt;
    if (!prompt) return setHelp(true);
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    // A prompt can only be used once; Chrome sends a fresh one on a later visit if they said no.
    window.__installPrompt = null;
    if (choice?.outcome === "accepted") setInstalled(true);
    dispatchEvent(new Event("installchange"));
  }

  const steps =
    mode === "ios" ? (
      <p className="flex flex-wrap items-center gap-1 text-sm">
        {t("installIos1")} <Share className="inline size-4" aria-label="Share" /> {t("installIos2")}
      </p>
    ) : (
      <p className="flex flex-wrap items-center gap-1 text-sm">
        {t("installMenu1")} <EllipsisVertical className="inline size-4" aria-label="Menu" /> {t("installMenu2")}
      </p>
    );

  return (
    <section
      aria-label={t("install")}
      className={cn(
        "flex flex-col gap-3 rounded-[1.375rem] p-4",
        variant === "banner" ? "bg-accent text-accent-foreground shadow-card" : "bg-card shadow-card",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("install")}</p>
          <p className="text-sm opacity-80">{t("installHint")}</p>
        </div>
        {variant === "banner" && (
          <button
            type="button"
            aria-label={t("installNotNow")}
            onClick={() => {
              setHidden(true);
              try {
                window.localStorage.setItem(HIDE_KEY, "1");
              } catch {}
            }}
            className="-mt-1 -mr-1 flex size-10 items-center justify-center rounded-full"
          >
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>
      {mode === "prompt" ? (
        <Button variant={variant === "banner" ? "dark" : "default"} onClick={install}>
          <Download aria-hidden />
          {t("install")}
        </Button>
      ) : mode === "ios" || help ? (
        steps
      ) : (
        <>
          <Button variant={variant === "banner" ? "dark" : "default"} onClick={() => setHelp(true)}>
            <Download aria-hidden />
            {t("install")}
          </Button>
        </>
      )}
    </section>
  );
}
