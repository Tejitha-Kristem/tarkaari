import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookingBanner } from "@/components/booking-banner";
import { BottomBar } from "@/components/bottom-bar";
import { LanguagePicker } from "@/components/language-picker";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** Request time, read once per request (the booking banner depends on it). */
async function requestTime() {
  await connection();
  return Date.now();
}

export default async function WelcomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const now = await requestTime();

  return (
    <>
      <main className="mx-auto flex w-full max-w-lg flex-col gap-7 px-4 pt-6 pb-36">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Image src="/icons/icon-192.png" alt="" width={48} height={48} priority className="rounded-xl" />
            <h1 className="text-2xl font-extrabold tracking-tight text-primary lowercase">{t("app.name")}</h1>
          </div>
          <p className="text-base text-muted-foreground">{t("app.tagline")}</p>
        </div>

        <section aria-labelledby="lang-title" className="flex flex-col gap-3">
          <h2 id="lang-title" className="text-lg font-semibold">
            {t("language.title")}
          </h2>
          <LanguagePicker />
        </section>

        <BookingBanner serverNow={now} />
      </main>

      <BottomBar>
        {/* Phase 2 points this at phone sign-in. */}
        <Button asChild size="lg" className="w-full">
          <Link href="/kit">
            {t("kit.openKit")}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </BottomBar>
    </>
  );
}
