"use client";

import { ClipboardList, House, Menu, Package, ShoppingBag, ShoppingCart, User, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: typeof House; match: (p: string) => boolean };

function NavLink({ tab }: { tab: Tab }) {
  const pathname = usePathname();
  const on = tab.match(pathname);
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={on ? "page" : undefined}
      className={cn(
        "flex h-16 flex-col items-center justify-center gap-1 text-xs",
        on ? "font-semibold text-primary" : "font-medium text-[#6b7a74]",
      )}
    >
      <Icon className="size-[22px]" strokeWidth={on ? 2.4 : 2} aria-hidden />
      {tab.label}
    </Link>
  );
}

/** Raised centre button (cart for customers, orders for vendors) with a count badge. */
function CentreButton({ href, label, icon: Icon, badge }: { href: string; label: string; icon: typeof House; badge?: string | null }) {
  return (
    <div className="flex justify-center">
      <Link
        href={href}
        aria-label={badge ? `${label} · ${badge}` : label}
        className="relative -mt-8 flex size-[60px] items-center justify-center rounded-full border-[5px] border-background bg-primary text-primary-foreground shadow-raised"
      >
        <Icon className="size-6" aria-hidden />
        {badge && (
          <span className="absolute -top-1 -right-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">
            {badge}
          </span>
        )}
      </Link>
    </div>
  );
}

function Shell({ left, centre, right }: { left: Tab[]; centre: React.ReactNode; right: Tab[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg rounded-t-[1.5rem] bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgb(16_35_29/0.08)]">
      <div className="grid grid-cols-5 items-center">
        {left.map((tab) => (
          <NavLink key={tab.href} tab={tab} />
        ))}
        {centre}
        {right.map((tab) => (
          <NavLink key={tab.href} tab={tab} />
        ))}
      </div>
    </nav>
  );
}

export function CustomerNav({ cartCount }: { cartCount: number }) {
  const t = useTranslations("nav");
  return (
    <Shell
      left={[
        { href: "/shop", label: t("shop"), icon: House, match: (p) => p.startsWith("/shop") },
        { href: "/order", label: t("order"), icon: ClipboardList, match: (p) => p.startsWith("/order") || p.startsWith("/bill") },
      ]}
      centre={<CentreButton href="/cart" label={t("cart")} icon={ShoppingCart} badge={cartCount ? String(cartCount) : null} />}
      right={[
        { href: "/payments", label: t("payments"), icon: Wallet, match: (p) => p.startsWith("/payments") },
        { href: "/profile", label: t("profile"), icon: User, match: (p) => p.startsWith("/profile") || p.startsWith("/notifications") },
      ]}
    />
  );
}

export function VendorNav({ newOrders }: { newOrders: number }) {
  const t = useTranslations("nav");
  return (
    <Shell
      left={[
        { href: "/vendor", label: t("today"), icon: House, match: (p) => p === "/vendor" },
        { href: "/vendor/buy", label: t("buy"), icon: ShoppingBag, match: (p) => p.startsWith("/vendor/buy") },
      ]}
      centre={<CentreButton href="/vendor/orders" label={t("orders")} icon={ClipboardList} badge={newOrders ? String(newOrders) : null} />}
      right={[
        { href: "/vendor/pack", label: t("pack"), icon: Package, match: (p) => p.startsWith("/vendor/pack") },
        {
          href: "/vendor/more",
          label: t("more"),
          icon: Menu,
          match: (p) => ["/vendor/more", "/vendor/items", "/vendor/apartments", "/vendor/payments"].some((x) => p.startsWith(x)),
        },
      ]}
    />
  );
}
