import { ShoppingBasket, Store } from "lucide-react";
import Image from "next/image";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguagePicker } from "@/components/language-picker";
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
      <section className="flex flex-col gap-5 rounded-b-[2rem] bg-primary px-5 pt-8 pb-7 text-primary-foreground">
        <div className="flex items-center gap-3">
          <Image src="/icons/icon-192.png" alt="" width={44} height={44} priority className="rounded-xl" />
          <span className="text-2xl font-bold tracking-tight lowercase">{t("app.name")}</span>
        </div>
        <h1 className="text-[1.75rem] leading-tight font-semibold text-balance">{t("welcome.title")}</h1>
        <ol className="grid grid-cols-3 gap-2 text-sm">
          {(["how1", "how2", "how3"] as const).map((k, i) => (
            <li key={k} className="flex flex-col gap-2 rounded-2xl bg-white/10 p-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">{i + 1}</span>
              <span className="leading-snug">{t(`welcome.${k}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-6 px-4 pt-6 pb-10">
        <section aria-labelledby="lang" className="flex flex-col gap-3">
          <h2 id="lang" className="text-lg font-semibold">{t("language.title")}</h2>
          <LanguagePicker />
        </section>

        <section aria-labelledby="role" className="flex flex-col gap-3">
          <h2 id="role" className="text-lg font-semibold">{t("welcome.chooseRole")}</h2>
          <Link href="/login?as=customer" className="flex items-center gap-4 rounded-[1.375rem] bg-card p-4 shadow-card active:scale-[0.99]">
            <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-mint text-primary">
              <ShoppingBasket className="size-7" />
            </span>
            <span className="flex flex-col">
              <span className="text-lg font-semibold">{t("welcome.buy")}</span>
              <span className="text-sm text-muted-foreground">{t("welcome.buySub")}</span>
            </span>
          </Link>
          <Link href="/login?as=vendor" className="flex items-center gap-4 rounded-[1.375rem] bg-card p-4 shadow-card active:scale-[0.99]">
            <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-peach text-[#7a4a12]">
              <Store className="size-7" />
            </span>
            <span className="flex flex-col">
              <span className="text-lg font-semibold">{t("welcome.sell")}</span>
              <span className="text-sm text-muted-foreground">{t("welcome.sellSub")}</span>
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
