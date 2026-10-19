import { Clock, Share2, ShieldAlert } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitch } from "@/components/language-switch";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/data/viewer";
import { joinLink, whatsappShare } from "@/lib/site";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { LogoutButton } from "@/components/logout-button";

export default async function VendorReviewPage({ params }: PageProps<"/[locale]/vendor/review">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const viewer = await getViewer();
  if (!viewer) redirect({ href: "/login?as=vendor", locale: locale as Locale });
  const vendor = viewer!.vendor;
  if (!vendor) redirect({ href: "/vendor/setup", locale: locale as Locale });
  if (vendor!.approval_status === "active") redirect({ href: "/vendor", locale: locale as Locale });

  const t = await getTranslations();
  const { data: apts } = await viewer!.supabase
    .from("vendor_apartments")
    .select("invite_code, apartment:apartments(name)")
    .eq("vendor_id", vendor!.id);
  const status = vendor!.approval_status;
  const Icon = status === "pending" ? Clock : ShieldAlert;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-4 pt-4 pb-10">
      <div className="flex justify-end">
        <LanguageSwitch />
      </div>
      <section className="flex flex-col items-center gap-3 rounded-[1.5rem] bg-primary px-6 py-8 text-center text-primary-foreground">
        <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon className="size-8" />
        </span>
        <h1 className="text-2xl font-semibold">{vendor!.shop_name}</h1>
        <p className="text-lg font-semibold">{t("vendorReview.title")}</p>
        <p className="text-on-dark-muted">
          {status === "pending" ? t("vendorReview.body") : status === "paused" ? t("vendorReview.paused") : t("vendorReview.blocked")}
        </p>
      </section>
      {status === "pending" && (apts?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-3 rounded-[1.375rem] bg-card p-4 shadow-card">
          <p className="font-semibold">{t("vendorReview.next")}</p>
          <p className="text-sm text-muted-foreground">{t("vendorReview.nextBody")}</p>
          {apts!.map((a) => (
            <Button key={a.invite_code} asChild variant="dark">
              <a
                href={whatsappShare(t("vendorApts.shareText", { shop: vendor!.shop_name, apartment: a.apartment?.name ?? "", link: joinLink(a.invite_code) }))}
                target="_blank"
                rel="noreferrer"
              >
                <Share2 aria-hidden />
                {a.apartment?.name}
              </a>
            </Button>
          ))}
        </section>
      )}
      <Button asChild variant="outline" size="lg">
        <Link href="/vendor/review">{t("vendorReview.check")}</Link>
      </Button>
      <LogoutButton />
    </main>
  );
}
