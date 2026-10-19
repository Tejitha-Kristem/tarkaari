import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { assertSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

/** Supabase client for Client Components. Runs as the signed-in user, so RLS applies. */
export function createClient() {
  assertSupabaseConfigured();
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
