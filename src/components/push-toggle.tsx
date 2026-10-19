"use client";

import { Bell, BellRing } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removePushSubscription, savePushSubscription } from "@/lib/actions/push";

const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "off" | "on";

/** Turns web push on for this phone. Hidden behind a clear message where it can't work (iOS outside the home screen). */
export function PushToggle() {
  const t = useTranslations("profile");
  const te = useTranslations("errors");
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supported = !!vapidKey && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    (supported ? navigator.serviceWorker.ready : Promise.reject(new Error("unsupported")))
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub && Notification.permission === "granted" ? "on" : "off"))
      .catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await savePushSubscription(json, navigator.userAgent);
      if (!res.ok) {
        toast(te(res.error));
        return;
      }
      setState("on");
    } catch {
      setState("unsupported");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
    setBusy(false);
  }

  if (state === "loading") return null;
  if (state === "unsupported") return <p className="text-sm text-muted-foreground">{t("pushUnsupported")}</p>;
  if (state === "on")
    return (
      <Button variant="secondary" className="w-full justify-start" loading={busy} onClick={turnOff}>
        <BellRing aria-hidden />
        {t("pushOn")}
      </Button>
    );
  return (
    <Button variant="dark" className="w-full justify-start" loading={busy} onClick={turnOn}>
      <Bell aria-hidden />
      {t("enablePush")}
    </Button>
  );
}
