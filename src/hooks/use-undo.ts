"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

export const UNDO_WINDOW_MS = 5000;

/**
 * Apply a change right away and offer "Undo" for 5 seconds.
 * `commit` runs only if the user does not undo (e.g. the server call).
 */
export function useUndo() {
  const t = useTranslations("common");

  return useCallback(
    ({ message, undo, commit }: { message: string; undo: () => void; commit?: () => void }) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        commit?.();
      };
      toast(message, {
        duration: UNDO_WINDOW_MS,
        action: {
          label: t("undo"),
          onClick: () => {
            settled = true;
            undo();
          },
        },
        onAutoClose: finish,
        onDismiss: finish,
      });
    },
    [t],
  );
}
