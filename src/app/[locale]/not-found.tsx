import { Home, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations();
  return (
    <>
      <AppHeader title={t("app.name")} />
      <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
        <SearchX className="size-16 text-muted-foreground" aria-hidden />
        <Button asChild size="lg" className="w-full">
          <Link href="/">
            <Home aria-hidden />
            {t("common.home")}
          </Link>
        </Button>
      </main>
    </>
  );
}
