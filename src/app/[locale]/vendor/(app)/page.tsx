import { ChevronRight, ClipboardCheck, MessageCircle, Package, ShoppingBag, Wallet } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitch } from "@/components/language-switch";
import { GreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { aggregate, requireVendorData, getVendorOrders } from "@/lib/data/vendor";
import { formatRange, rupees, shortDate } from "@/lib/format";
import { joinLink, whatsappShare } from "@/lib/site";
import { cn } from "@/lib/utils";
import { LockCountdown } from "./lock-countdown";

export default async function VendorToday({ params }: PageProps<"/[locale]/vendor">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const loc = await getLocale();
  const data = await requireVendorData();
  const { booking, vendor, today, nextDate } = data;
  const [todayOrders, nextOrders, dues] = await Promise.all([
    getVendorOrders(today),
    getVendorOrders(nextDate),
    data.viewer.supabase.rpc("vendor_dues"),
  ]);
  const placed = nextOrders.filter((o) => o.status === "placed").length;
  const estMin = nextOrders.reduce((a, o) => a + Number(o.est_min), 0);
  const estMax = nextOrders.reduce((a, o) => a + Number(o.est_max), 0);
  const toDeliver = todayOrders.filter((o) => o.status !== "placed");
  const delivered = todayOrders.filter((o) => o.status === "delivered").length;
  // Buying happens the morning of delivery; after 5 pm the list for tomorrow is final.
  const buyWhich = booking.phase === "locked" ? "next" : "today";
  const buyItems = aggregate(buyWhich === "next" ? nextOrders : todayOrders, loc).length;
  const owing = (dues.data ?? []).filter((d) => Number(d.balance) > 0);
  const toCollect = owing.reduce((a, d) => a + Number(d.balance), 0);
  const nextLabel = shortDate(nextDate, loc, { weekday: "long", day: "numeric", month: "short" });

  let step: { title: string; body?: string; href?: string; cta?: string };
  if (booking.phase === "locked" && placed > 0)
    step = { title: t("vendor.acceptTitle", { count: placed }), href: "/vendor/orders?d=next", cta: t("vendor.review") };
  else if (toDeliver.length > delivered)
    step = { title: t("vendor.packNow"), href: "/vendor/pack?d=today", cta: t("vendor.openPack") };
  else if (booking.phase === "locked" && nextOrders.length > 0)
    step = { title: t("vendor.allAccepted"), href: "/vendor/buy?d=next", cta: t("vendorBuy.title") };
  else if (booking.phase === "open") step = { title: t("vendor.acceptLater") };
  else step = { title: t("vendor.noOrders", { date: nextLabel }) };

  const first = data.apartments.find((a) => a.active);
  const tiles = [
    { href: `/vendor/buy?d=${buyWhich}`, icon: ShoppingBag, title: t("vendor.buyTitle"), sub: t("vendor.buySub", { count: buyItems }), tint: "bg-mint" },
    {
      href: "/vendor/pack?d=today",
      icon: Package,
      title: t("vendor.packTitle"),
      sub: t("vendor.packSub", { done: delivered, count: toDeliver.length }),
      tint: "bg-peach",
    },
    {
      href: "/vendor/payments",
      icon: Wallet,
      title: rupees(toCollect),
      sub: t("vendor.duesSub", { count: owing.length }),
      tint: "bg-blush",
    },
    { href: "/vendor/apartments", icon: MessageCircle, title: t("vendor.share"), sub: t("vendor.shareSub"), tint: "bg-lilac" },
  ];

  return (
    <>
      <GreenHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-on-dark-muted">{vendor.shop_name}</p>
            <h1 className="text-2xl font-semibold">{t("vendor.hello", { name: data.viewer.profile.name ?? "" })}</h1>
          </div>
          <LanguageSwitch onDark />
        </div>
        <LockCountdown booking={booking} nextLabel={nextLabel} />
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-2xl font-bold">{nextOrders.length}</p>
            <p className="text-sm text-on-dark-muted">{t("vendor.orders", { count: nextOrders.length })}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-2xl font-bold">{nextOrders.length ? formatRange(estMin, estMax) : "₹0"}</p>
            <p className="text-sm text-on-dark-muted">{t("vendor.estSales")}</p>
          </div>
        </div>
      </GreenHeader>

      <div className="flex flex-col gap-5 px-4 pt-5 pb-10">
        <section className="flex flex-col gap-3 rounded-[1.5rem] bg-accent p-4 text-accent-foreground shadow-card">
          <p className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
            <ClipboardCheck className="size-4" aria-hidden />
            {t("vendor.nextStep")}
          </p>
          <p className="text-lg leading-snug font-semibold">{step.title}</p>
          {step.href && (
            <Button asChild variant="dark" size="lg">
              <Link href={step.href}>{step.cta}</Link>
            </Button>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3">
          {tiles.map(({ href, icon: Icon, title, sub, tint }) => (
            <Link key={href} href={href} className="flex flex-col gap-3 rounded-[1.375rem] bg-card p-4 shadow-card active:scale-[0.99]">
              <span aria-hidden className={cn("flex size-11 items-center justify-center rounded-2xl text-primary", tint)}>
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block leading-tight font-semibold">{title}</span>
                <span className="text-sm text-muted-foreground">{sub}</span>
              </span>
            </Link>
          ))}
        </div>

        {booking.phase === "open" && first?.invite_code && (
          <Button asChild variant="outline" className="justify-between">
            <a
              href={whatsappShare(
                t("vendor.remindText", { shop: vendor.shop_name, apartment: first.apartment.name, link: joinLink(first.invite_code) }),
              )}
              target="_blank"
              rel="noreferrer"
            >
              <span className="flex items-center gap-2">
                <MessageCircle aria-hidden />
                {t("vendor.remindGroup")}
              </span>
              <ChevronRight aria-hidden />
            </a>
          </Button>
        )}
      </div>
    </>
  );
}
