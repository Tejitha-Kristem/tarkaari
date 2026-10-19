"use client";

import { ArrowLeft, MessageSquareText, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { demoSignIn, type DemoRole } from "@/lib/actions/demo";
import { otpErrorCode } from "@/lib/auth-errors";
import { INTENT_COOKIE } from "@/lib/cookies";
import { prettyPhone } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

const DEMO_NUMBERS = { customer: "90000 00001", vendor: "90000 00002" } as const;
const demoRoleFor = (digits: string): DemoRole | null =>
  ({ "9000000001": "customer", "9000000002": "vendor", "9000000005": "admin" }) [digits] as DemoRole | undefined ?? null;

export function LoginForm({ as, showTestHint, demo }: { as: "customer" | "vendor"; showTestHint: boolean; demo: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(demo ? DEMO_NUMBERS[as] : "");
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
    const demoRole = demo ? demoRoleFor(digits) : null;
    if (demoRole) return demoLogin(demoRole);
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

  /** Demo numbers skip the SMS: show the code step, type the code in by itself, sign in. */
  async function demoLogin(role: DemoRole) {
    setError(null);
    setStep("code");
    setBusy(true);
    for (let i = 1; i <= 6; i++) {
      await new Promise((r) => setTimeout(r, 90));
      setCode("123456".slice(0, i));
    }
    const res = await demoSignIn(role, locale === "kn" ? "kn" : "en");
    if (!res.ok) {
      setBusy(false);
      setStep("phone");
      setError(t(`errors.${res.error}`));
      return;
    }
    // Full load so the server sees the new session cookies.
    window.location.href = "/";
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
          <p className="text-muted-foreground">{demo ? t("login.demoHint") : t("login.hint")}</p>
          <label className="flex h-16 items-center gap-3 rounded-2xl border-2 border-input bg-card px-4 focus-within:border-primary">
            <span className="text-xl font-semibold text-muted-foreground">+91</span>
            <input
              autoFocus={!demo}
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
          <p className="text-muted-foreground">
            {demo && demoRoleFor(phone.replace(/\D/g, "").slice(-10)) ? t("login.demoCodeFilled") : t("login.codeSentTo", { phone: prettyPhone(phone) })}
          </p>
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
