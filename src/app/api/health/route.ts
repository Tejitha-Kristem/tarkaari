import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/**
 * Setup check for whoever deploys the app: open /api/health. Reports only
 * yes/no facts, never keys. Each "fix" says what to change.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string; fix?: string }> = {};
  const started = Date.now();

  checks.supabaseVariables = isSupabaseConfigured
    ? { ok: true }
    : { ok: false, fix: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel, then redeploy." };
  checks.secretKey = process.env.SUPABASE_SECRET_KEY
    ? { ok: true }
    : { ok: false, fix: "Add SUPABASE_SECRET_KEY in Vercel (needed for reminders and push)." };

  if (isSupabaseConfigured) {
    const headers = { apikey: supabasePublishableKey, "Content-Type": "application/json" };
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers, cache: "no-store" });
      const s = (await res.json()) as { external?: { phone?: boolean }; sms_provider?: string; disable_signup?: boolean };
      checks.phoneSignIn = s.external?.phone
        ? { ok: true, detail: `SMS provider: ${s.sms_provider || "none"}` }
        : { ok: false, fix: "Supabase → Authentication → Sign In / Providers → Phone: enable it (and add test numbers)." };
      if (s.disable_signup) checks.signUps = { ok: false, fix: "Supabase → Authentication → allow new users to sign up." };
    } catch {
      checks.phoneSignIn = { ok: false, fix: "Couldn't reach Supabase Auth. Check NEXT_PUBLIC_SUPABASE_URL." };
    }
    try {
      const t = Date.now();
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/booking_state`, { method: "POST", headers, body: "{}", cache: "no-store" });
      checks.database = res.ok
        ? { ok: true, detail: `round trip ${Date.now() - t} ms` }
        : { ok: false, fix: "Run the files in supabase/migrations (in order) and supabase/seed.sql in the Supabase SQL Editor." };
    } catch {
      checks.database = { ok: false, fix: "Couldn't reach the database API." };
    }
  }

  checks.siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? { ok: true, detail: process.env.NEXT_PUBLIC_SITE_URL }
    : { ok: false, fix: "Set NEXT_PUBLIC_SITE_URL to https://<your app>.vercel.app so WhatsApp links work." };
  checks.push = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    ? { ok: true }
    : { ok: false, fix: "Optional: run `npx web-push generate-vapid-keys` and add the VAPID variables for phone alerts." };
  checks.cron = process.env.CRON_SECRET ? { ok: true } : { ok: false, fix: "Set CRON_SECRET so the daily reminders run." };
  checks.serverRegion = {
    ok: !process.env.VERCEL_REGION || process.env.VERCEL_REGION === "bom1",
    detail: process.env.VERCEL_REGION ?? "local",
    fix: "vercel.json pins the app to bom1 (Mumbai), next to the database. Redeploy if this shows another region.",
  };

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ok: allOk, ms: Date.now() - started, checks });
}
