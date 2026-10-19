import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Tables } from "@/types/database";

export type Viewer = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  profile: Tables<"users">;
  household: (Tables<"households"> & { apartment: Tables<"apartments"> | null }) | null;
  vendor: Tables<"vendors"> | null;
};

/** The signed-in user with profile, household and vendor rows, once per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: household }, { data: vendor }] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).maybeSingle(),
    supabase.from("households").select("*, apartment:apartments(*)").eq("user_id", userId).maybeSingle(),
    supabase.from("vendors").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile) return null;
  return { supabase, userId, profile, household: household ?? null, vendor: vendor ?? null };
});

/** Where a signed-in user belongs right now. */
export function homeFor(viewer: Viewer): string {
  if (viewer.profile.status === "blocked") return "/blocked";
  if (viewer.profile.role === "admin") return "/admin";
  if (viewer.profile.role === "vendor" || viewer.vendor) {
    if (!viewer.vendor) return "/vendor/setup";
    if (viewer.vendor.approval_status === "active") return "/vendor";
    return "/vendor/review";
  }
  if (!viewer.profile.name || !viewer.household) return "/onboarding";
  return "/shop";
}

/** For admin pages, which render alongside (not after) the admin layout's check. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || viewer.profile.role !== "admin" || viewer.profile.status !== "active") redirect("/");
  return viewer;
}
