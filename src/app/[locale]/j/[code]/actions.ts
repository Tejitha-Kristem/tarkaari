"use server";

import { getLocale } from "next-intl/server";
import { rememberInvite } from "@/lib/actions/onboarding";
import { getViewer } from "@/lib/data/viewer";
import { redirect } from "@/i18n/navigation";

export async function joinInvite(code: string) {
  await rememberInvite(code);
  const viewer = await getViewer();
  redirect({ href: viewer ? "/onboarding" : "/login?as=customer", locale: await getLocale() });
}
