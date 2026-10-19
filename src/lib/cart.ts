"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/** vendorItemId → quantity, for one delivery date. Kept on the phone until the order is placed. */
export type Cart = Record<string, number>;

const listeners = new Set<() => void>();
const memory = new Map<string, string>();
const EMPTY = "{}";

const keyFor = (scope: string) => `tarakari:cart:${scope}`;

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? EMPTY;
  } catch {
    return memory.get(key) ?? EMPTY;
  }
}

function write(key: string, cart: Cart) {
  const raw = JSON.stringify(cart);
  memory.set(key, raw);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // Private mode or storage full: the in-memory copy still works this session.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = () => listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Shared cart for a delivery date. `seed` (the placed order) is used until the user changes something. */
export function useCart(scope: string, seed?: Cart) {
  const key = keyFor(scope);
  const raw = useSyncExternalStore(subscribe, () => read(key), () => EMPTY);
  const stored = useMemo(() => {
    try {
      return JSON.parse(raw) as Cart;
    } catch {
      return {};
    }
  }, [raw]);
  const touched = raw !== EMPTY;
  const cart: Cart = touched ? stored : (seed ?? {});

  const setQty = useCallback(
    (id: string, qty: number) => {
      const next = { ...(touched ? stored : (seed ?? {})) };
      if (qty <= 0) delete next[id];
      else next[id] = Math.round(qty * 1000) / 1000;
      // An emptied cart is stored explicitly so the seed doesn't come back.
      write(key, Object.keys(next).length ? next : { __empty: 0 });
    },
    [key, stored, seed, touched],
  );
  const replace = useCallback((next: Cart) => write(key, Object.keys(next).length ? next : { __empty: 0 }), [key]);
  const reset = useCallback(() => {
    memory.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {}
    listeners.forEach((l) => l());
  }, [key]);

  const clean = Object.fromEntries(Object.entries(cart).filter(([id, q]) => id !== "__empty" && q > 0));
  return { cart: clean, count: Object.keys(clean).length, setQty, replace, reset, touched };
}
