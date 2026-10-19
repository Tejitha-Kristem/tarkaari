"use client";

import { ArrowLeft, MessageSquareText, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { otpErrorCode } from "@/lib/auth-errors";
import { INTENT_COOKIE } from "@/lib/cookies";
import { prettyPhone } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ as, showTestHint }: { as: "customer" | "vendor"; showTestHint: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function sendCode() {
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError(t("errors.invalid_phone"));
      return;
    }
    setBusy(true);
    setError(null);
    let error: unknown = null;
    try {
      ({ error } = await createClient().auth.signInWithOtp({
        phone: `+91${digits}`,
        options: { data: { language: locale } },
      }));
    } catch (e) {
      error = e;
    }
    setBusy(false);
    if (error) {
      console.error("Sending the code failed:", error);
      setError(t(`errors.${otpErrorCode(error, "send")}`));
      return;
    }
    setStep("code");
    setWait(30);
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function verify(value: string) {
    if (value.length !== 6) return;
    setBusy(true);
    setError(null);
    const digits = phone.replace(/\D/g, "").slice(-10);
    let error: unknown = null;
    try {
      ({ error } = await createClient().auth.verifyOtp({ phone: `+91${digits}`, token: value, type: "sms" }));
    } catch (e) {
      error = e;
    }
    if (error) {
      console.error("Checking the code failed:", error);
      setBusy(false);
      setError(t(`errors.${otpErrorCode(error, "verify")}`));
      setCode("");
      return;
    }
    document.cookie = `${INTENT_COOKIE}=${as}; path=/; max-age=604800; samesite=lax`;
    // Full load so the server sees the new session cookies.
    window.location.href = "/";
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-4 pb-8">
      <div className="flex items-center justify-between">
        {step === "phone" ? (
          <Link href="/" aria-label={t("common.back")} className="flex size-11 items-center justify-center rounded-full bg-card shadow-card">
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep("phone")}
            aria-label={t("login.changeNumber")}
            className="flex size-11 items-center justify-center rounded-full bg-card shadow-card"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        )}
        <LanguageSwitch />
      </div>

      {step === "phone" ? (
        <form
          className="mt-8 flex flex-1 flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <span aria-hidden className="flex size-14 items-center justify-center rounded-2xl bg-mint text-primary">
            <Phone className="size-7" />
          </span>
          <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
          <p className="text-muted-foreground">{t("login.hint")}</p>
          <label className="flex h-16 items-center gap-3 rounded-2xl border-2 border-input bg-card px-4 focus-within:border-primary">
            <span className="text-xl font-semibold text-muted-foreground">+91</span>
            <input
              autoFocus
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              aria-label={t("login.phoneLabel")}
              placeholder="98765 43210"
              value={phone}
              maxLength={11}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))}
              className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-wider outline-none placeholder:text-input"
            />
          </label>
          {error && <p role="alert" className="font-medium text-destructive">{error}</p>}
          {showTestHint && <p className="rounded-2xl bg-butter p-3 text-sm">{t("login.testHint")}</p>}
          <Button type="submit" size="lg" className="mt-auto w-full" loading={busy}>
            {t("login.sendCode")}
          </Button>
        </form>
      ) : (
        <form
          className="mt-8 flex flex-1 flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verify(code);
          }}
        >
          <span aria-hidden className="flex size-14 items-center justify-center rounded-2xl bg-mint text-primary">
            <MessageSquareText className="size-7" />
          </span>
          <h1 className="text-2xl font-semibold">{t("login.codeTitle")}</h1>
          <p className="text-muted-foreground">{t("login.codeSentTo", { phone: prettyPhone(phone) })}</p>
          <input
            ref={codeRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={t("login.codeLabel")}
            maxLength={6}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              if (v.length === 6) void verify(v);
            }}
            className="h-16 rounded-2xl border-2 border-input bg-card text-center text-3xl font-semibold tracking-[0.5em] outline-none focus:border-primary"
          />
          {error && <p role="alert" className="font-medium text-destructive">{error}</p>}
          <button
            type="button"
            disabled={wait > 0 || busy}
            onClick={() => void sendCode()}
            className="h-12 self-start font-semibold text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {wait > 0 ? t("login.resendIn", { seconds: wait }) : t("login.resend")}
          </button>
          <Button type="submit" size="lg" className="mt-auto w-full" loading={busy} disabled={code.length !== 6}>
            {t("login.verify")}
          </Button>
        </form>
      )}
    </main>
  );
}
