import type { Metadata, Viewport } from "next";
import { Noto_Sans_Kannada, Outfit } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { INSTALL_CAPTURE } from "@/components/install-app";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import "../globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const notoKannada = Noto_Sans_Kannada({
  subsets: ["kannada"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-kannada",
  display: "swap",
});

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "en" | "kn", namespace: "app" });
  return {
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("tagline"),
    applicationName: "Tarkaari",
    appleWebApp: { capable: true, title: t("name"), statusBarStyle: "default" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#0f3d32",
  width: "device-width",
  initialScale: 1,
  // Zoom stays enabled: some users will pinch to read.
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale === "kn" ? "kn-IN" : "en-IN"} className={`${outfit.variable} ${notoKannada.variable}`}>
      <body className="min-h-dvh">
        {/* Must run before hydration: Chrome offers installing only once per page load. */}
        <script dangerouslySetInnerHTML={{ __html: INSTALL_CAPTURE }} />
        <NextIntlClientProvider>
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
