"use client";

import { createContext, useContext, type ReactNode } from "react";
import { CustomerNav } from "@/components/bottom-nav";
import { useCart, type Cart } from "@/lib/cart";

type Ctx = { scope: string; seed: Cart };
const CartScope = createContext<Ctx>({ scope: "none", seed: {} });

/** The customer's cart for the date they can order for right now. */
export function useCustomerCart() {
  const { scope, seed } = useContext(CartScope);
  return useCart(scope, seed);
}

function Nav() {
  const { count } = useCustomerCart();
  return <CustomerNav cartCount={count} />;
}

export function CustomerShell({ scope, seed, children }: { scope: string; seed: Cart; children: ReactNode }) {
  return (
    <CartScope.Provider value={{ scope, seed }}>
      <div className="mx-auto min-h-dvh w-full max-w-lg pb-28">{children}</div>
      <Nav />
    </CartScope.Provider>
  );
}
