import { getLocale, setRequestLocale } from "next-intl/server";
import { getCatalogue } from "@/lib/data/catalogue";
import { getViewer } from "@/lib/data/viewer";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { VendorSetupWizard } from "./wizard";

export default async function VendorSetupPage({ params }: PageProps<"/[locale]/vendor/setup">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const viewer = await getViewer();
  if (!viewer) redirect({ href: "/login?as=vendor", locale: await getLocale() });
  if (viewer!.vendor) redirect({ href: viewer!.vendor.approval_status === "active" ? "/vendor" : "/vendor/review", locale: locale as Locale });
  const catalogue = await getCatalogue(viewer!.supabase);
  return <VendorSetupWizard userId={viewer!.userId} initialName={viewer!.profile.name ?? ""} catalogue={catalogue} />;
}
