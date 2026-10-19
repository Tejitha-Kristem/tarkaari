import { setRequestLocale } from "next-intl/server";
import { readInvite } from "@/lib/actions/onboarding";
import { getViewer } from "@/lib/data/viewer";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { OnboardingWizard } from "./wizard";

export default async function OnboardingPage({ params }: PageProps<"/[locale]/onboarding">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const viewer = await getViewer();
  if (!viewer) redirect({ href: "/login?as=customer", locale: locale as Locale });
  const invite = await readInvite();
  if (viewer!.household && viewer!.profile.name && !invite) redirect({ href: "/shop", locale: locale as Locale });

  return (
    <OnboardingWizard
      initialName={viewer!.profile.name ?? ""}
      invite={
        invite
          ? {
              apartment: { id: invite.apartment_id, name: invite.apartment_name, area: invite.apartment_area },
              vendorId: invite.vendor_id,
              shopName: invite.shop_name,
            }
          : null
      }
    />
  );
}
