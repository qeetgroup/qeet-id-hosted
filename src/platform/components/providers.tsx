"use client";

import { QeetrixProvider } from "@qeetrix/react/provider";
import type { ReactNode } from "react";

import { I18nProvider } from "@/i18n/provider";
import { THEME_STORAGE_KEY } from "@/platform/config/theme";

/**
 * What every page renders inside: Qeetrix's settings, with the colour scheme following the
 * system until the person chooses (the choice kept in this browser, read before first paint by
 * the root layout's script), and the copy.
 */
export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <QeetrixProvider defaultColorScheme="system" storageKey={THEME_STORAGE_KEY}>
      <I18nProvider>{children}</I18nProvider>
    </QeetrixProvider>
  );
}
