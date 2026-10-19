"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data/viewer";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { pushSoon } from "@/lib/notify/soon";
import type { Enums } from "@/types/database";

async function admin() {
  const viewer = await getViewer();
  return viewer?.profile.role === "admin" && viewer.profile.status === "active" ? viewer.supabase : null;
}

async function call(fn: (s: NonNullable<Awaited<ReturnType<typeof admin>>>) => PromiseLike<{ error: unknown }>): Promise<ActionResult> {
  const s = await admin();
  if (!s) return fail({ message: "not_admin" });
  const { error } = await fn(s);
  if (error) return fail(error as { message: string });
  pushSoon();
  revalidatePath("/admin", "layout");
  return ok(null);
}

export const setVendorStatus = async (id: string, status: Enums<"vendor_approval">) =>
  call((s) => s.rpc("admin_set_vendor_status", { p_vendor_id: id, p_status: status }));

export const setUserStatus = async (id: string, status: Enums<"user_status">) =>
  call((s) => s.rpc("admin_set_user_status", { p_user_id: id, p_status: status }));

export const mergeApartments = async (from: string, into: string) =>
  call((s) => s.rpc("admin_merge_apartments", { p_from: from, p_into: into }));

export const removeApartment = async (id: string) => call((s) => s.rpc("admin_remove_apartment", { p_id: id }));

export const setReportStatus = async (id: string, status: Enums<"report_status">) =>
  call((s) => s.rpc("admin_set_report_status", { p_report_id: id, p_status: status }));
