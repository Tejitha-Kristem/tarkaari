"use client";

import { useEffect } from "react";
import { markNotificationsRead } from "@/lib/actions/push";

/** Marks the inbox read once it has been seen; the dots stay until the next visit. */
export function MarkRead() {
  useEffect(() => {
    markNotificationsRead();
  }, []);
  return null;
}
