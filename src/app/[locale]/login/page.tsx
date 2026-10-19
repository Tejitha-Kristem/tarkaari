import { getTranslations, setRequestLocale } from "next-intl/server";
import { getViewer } from "@/lib/data/viewer";
import { demoLoginEnabled, showTestLogin } from "@/lib/site";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { LoginForm } from "./login-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">) {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "login" });
  return { title: t("title") };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  if (await getViewer()) redirect({ href: "/", locale: locale as Locale });
  const as = (await searchParams).as === "vendor" ? "vendor" : "customer";
  return <LoginForm as={as} showTestHint={showTestLogin} demo={demoLoginEnabled()} />;
}
