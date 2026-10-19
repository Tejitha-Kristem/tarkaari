import { ShoppingBasket, Store } from "lucide-react";
import Image from "next/image";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InstallApp } from "@/components/install-app";
import { IntroLink } from "@/components/intro-slides";
import { LanguageSwitch } from "@/components/language-switch";
import { INTENT_COOKIE } from "@/lib/cookies";
import { getViewer, homeFor } from "@/lib/data/viewer";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export default async function WelcomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const viewer = await getViewer();
  if (viewer) {
    let href = homeFor(viewer);
    // Chose "I sell vegetables" before signing in, and is not a customer yet.
    const intent = (await cookies()).get(INTENT_COOKIE)?.value;
    if (intent === "vendor" && href === "/onboarding" && !viewer.household) href = "/vendor/setup";
    redirect({ href, locale: locale as Locale });
  }

  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <section className="flex flex-col gap-6 rounded-b-[2rem] bg-primary px-5 pt-6 pb-8 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/icons/icon-192.png" alt="" width={44} height={44} priority className="rounded-xl" />
            <span className="text-2xl font-bold tracking-tight lowercase">{t("app.name")}</span>
          </div>
          <LanguageSwitch onDark />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.75rem] leading-tight font-semibold text-balance">{t("welcome.title")}</h1>
          <p className="text-on-dark-muted">{t("welcome.subtitle")}</p>
        </div>
      </section>

      <div className="flex flex-1 flex-col gap-4 px-4 pt-6 pb-8">
        <h2 className="text-lg font-semibold">{t("welcome.chooseRole")}</h2>
        <Link href="/login?as=customer" className="flex items-center gap-4 rounded-[1.375rem] bg-card p-5 shadow-card active:scale-[0.99]">
          <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-mint text-primary">
            <ShoppingBasket className="size-7" />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-semibold">{t("welcome.buy")}</span>
            <span className="text-sm text-muted-foreground">{t("welcome.buySub")}</span>
          </span>
        </Link>
        <Link href="/login?as=vendor" className="flex items-center gap-4 rounded-[1.375rem] bg-card p-5 shadow-card active:scale-[0.99]">
          <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-peach text-[#7a4a12]">
            <Store className="size-7" />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-semibold">{t("welcome.sell")}</span>
            <span className="text-sm text-muted-foreground">{t("welcome.sellSub")}</span>
          </span>
        </Link>
        <IntroLink className="h-12 self-center font-semibold text-primary underline underline-offset-4" />
        <InstallApp className="mt-auto" />
      </div>
    </main>
  );
}
