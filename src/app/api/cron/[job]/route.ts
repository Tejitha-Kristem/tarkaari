import { NextResponse, type NextRequest } from "next/server";
import { deliverPending } from "@/lib/notify/push";
import { createAdminClient } from "@/lib/supabase/admin";

const JOBS = {
  "booking-reminder": "cron_booking_reminders",
  "accept-reminder": "cron_accept_reminders",
  "payment-due": "cron_payment_due",
  "monthly-statement": "cron_monthly_statements",
  push: null,
} as const;

// Vercel Cron calls these with "Authorization: Bearer $CRON_SECRET" (see vercel.json).
export async function GET(request: NextRequest, { params }: RouteContext<"/api/cron/[job]">) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { job } = await params;
  if (!(job in JOBS)) return NextResponse.json({ error: "unknown job" }, { status: 404 });
  const fn = JOBS[job as keyof typeof JOBS];
  let created = 0;
  if (fn) {
    const { data, error } = await createAdminClient().rpc(fn);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    created = data ?? 0;
  }
  const pushed = await deliverPending(1000);
  return NextResponse.json({ job, created, ...pushed });
}
