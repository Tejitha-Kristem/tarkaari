import type { ErrorCode } from "@/lib/errors";

/**
 * Supabase Auth errors during phone sign-in → a message the person can act on.
 * The admin hints in the text tell whoever set up the project what to fix.
 */
export function otpErrorCode(error: unknown, step: "send" | "verify"): ErrorCode {
  const e = (error ?? {}) as { code?: string; message?: string; status?: number; name?: string };
  const code = e.code ?? "";
  const message = (e.message ?? "").toLowerCase();
  if (e.name === "SupabaseNotConfigured") return "auth_not_configured";
  if (code === "phone_provider_disabled" || message.includes("unsupported phone provider") || message.includes("phone signups are disabled"))
    return "auth_phone_disabled";
  if (code === "over_sms_send_rate_limit" || code === "over_request_rate_limit" || e.status === 429) return "auth_rate_limited";
  if (code === "sms_send_failed" || message.includes("sms") || message.includes("twilio") || message.includes("messagebird") || message.includes("vonage"))
    return "auth_sms_failed";
  if (code === "otp_expired") return step === "verify" ? "invalid_code" : "auth_sms_failed";
  if (message.includes("failed to fetch") || message.includes("network")) return "offline";
  return step === "verify" ? "invalid_code" : "generic";
}
