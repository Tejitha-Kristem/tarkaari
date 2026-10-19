import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <main className="mx-auto max-w-lg px-4 pt-16">
      <EmptyState icon={SearchX} title="404">
        <Button asChild size="lg">
          <Link href="/">{t("home")}</Link>
        </Button>
      </EmptyState>
    </main>
  );
}
