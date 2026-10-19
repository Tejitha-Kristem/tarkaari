"use server";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { INTENT_COOKIE } from "@/lib/cookies";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { demoLoginEnabled } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DemoRole = "customer" | "vendor" | "admin";

/** Each role has a fixed demo account; the phone numbers match Supabase's test numbers. */
const DEMO: Record<DemoRole, { phone: string; email: string }> = {
  customer: { phone: "919000000001", email: "demo-customer@tarkaari.app" },
  vendor: { phone: "919000000002", email: "demo-vendor@tarkaari.app" },
  admin: { phone: "919000000005", email: "demo-admin@tarkaari.app" },
};

/**
 * Signs in to a demo account with no SMS: the server creates the account with
 * the secret key and signs in with a password only the server can derive.
 * Turn it off for real launch with DEMO_LOGIN=off.
 */
export async function demoSignIn(role: DemoRole, language: "en" | "kn"): Promise<ActionResult> {
  if (!demoLoginEnabled() || !DEMO[role]) return fail({ message: "demo_off" });
  const { phone, email } = DEMO[role];
  const password = createHmac("sha256", process.env.SUPABASE_SECRET_KEY!).update(email).digest("hex");
  const supabase = await createClient();

  let { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // First use: create the account, or attach email + password to the existing phone account.
    const admin = createAdminClient();
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: { language },
    });
    if (created.error) {
      const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = data?.users.find((u) => u.phone === phone || u.email === email);
      if (!existing) return fail({ message: "demo_failed" });
      const updated = await admin.auth.admin.updateUserById(existing.id, { email, password, email_confirm: true });
      if (updated.error) return fail({ message: "demo_failed" });
    }
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    if (error) {
      console.error("Demo sign-in failed:", error.message);
      return fail({ message: error.message?.toLowerCase().includes("email logins are disabled") ? "demo_email_off" : "demo_failed" });
    }
  }

  // The app needs the profile row that the database trigger makes. Check it, so a
  // missing database setup is reported here instead of bouncing back to the start.
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail({ message: "demo_failed" });
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin.from("users").select("id").eq("id", auth.user.id).maybeSingle();
  if (profileError) {
    console.error("Demo sign-in: profile lookup failed:", profileError.message);
    await supabase.auth.signOut();
    return fail({ message: "db_not_setup" });
  }
  if (!profile) {
    const { error: insertError } = await admin.from("users").insert({ id: auth.user.id, phone, language });
    if (insertError) {
      console.error("Demo sign-in: creating the profile failed:", insertError.message);
      await supabase.auth.signOut();
      return fail({ message: "db_not_setup" });
    }
  }
  if (role === "admin") await admin.from("users").update({ role: "admin", name: "Admin" }).eq("id", auth.user.id);
  (await cookies()).set(INTENT_COOKIE, role === "vendor" ? "vendor" : "customer", { path: "/", maxAge: 604800, sameSite: "lax" });
  return ok(null);
}
