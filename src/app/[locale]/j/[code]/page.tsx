import { Link2 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitch } from "@/components/language-switch";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { joinInvite } from "./actions";
import { Benefits } from "@/components/benefits";

async function resolve(code: string) {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("resolve_invite", { p_code: code });
  return data?.[0] ?? null;
}

// The WhatsApp link preview shows the shop and apartment.
export async function generateMetadata({ params }: PageProps<"/[locale]/j/[code]">): Promise<Metadata> {
  const { locale, code } = await params;
  const invite = await resolve(code);
  const t = await getTranslations({ locale: locale as Locale, namespace: "join" });
  if (!invite) return { title: "Tarkaari" };
  const title = invite.shop_name ? t("metaTitle", { shop: invite.shop_name }) : invite.apartment_name;
  const description = t("metaBody", { apartment: invite.apartment_name });
  return { title, description, openGraph: { title, description, images: ["/icons/icon-512.png"] } };
}

export default async function JoinPage({ params }: PageProps<"/[locale]/j/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const invite = await resolve(code);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-4 pb-8">
      <div className="flex justify-end">
        <LanguageSwitch />
      </div>
      {!invite ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold">{t("errors.invite_invalid")}</p>
          <Button asChild size="lg">
            <Link href="/">{t("join.homeBtn")}</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-success">
            <Link2 className="size-4" aria-hidden />
            {t("join.fromWhatsApp")}
          </p>
          <div className="mt-3 overflow-hidden rounded-[1.5rem] bg-card shadow-card">
            <div className="bg-primary px-5 py-6 text-primary-foreground">
              <p className="text-2xl font-semibold">{invite.shop_name ?? invite.apartment_name}</p>
              <p className="mt-1 text-on-dark-muted">{invite.shop_name ? t("join.invites") : t("join.apartmentInvite")}</p>
            </div>
            <div className="p-5">
              <p className="text-lg font-semibold">{invite.apartment_name}</p>
              <p className="text-muted-foreground">{invite.apartment_area}</p>
            </div>
          </div>
          <ol className="mt-5 flex flex-col gap-3">
            {(["how1", "how2", "how3"] as const).map((k, i) => (
              <li key={k} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">{i + 1}</span>
                {t(`welcome.${k}`)}
              </li>
            ))}
          </ol>
          <Benefits className="mt-6" />
          <form action={joinInvite.bind(null, code)} className="mt-auto pt-6">
            <Button type="submit" size="lg" className="w-full">
              {t("join.joinBtn")}
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
