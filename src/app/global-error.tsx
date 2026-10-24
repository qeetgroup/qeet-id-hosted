"use client";

import "./globals.css";
import "@/i18n";

import { ThemeProvider } from "@qeetrix/ui/providers/theme-provider";

import { ErrorPage } from "@/platform/components/error-page";
import { THEME_STORAGE_KEY } from "@/platform/config/theme";

// Replaces the root layout when the layout itself fails, so it brings its own
// document, styles, copy and theme (the page header carries the theme toggle).
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="bg-background text-foreground min-h-full font-sans">
        <ThemeProvider defaultTheme="system" storageKey={THEME_STORAGE_KEY}>
          <ErrorPage reference={error.digest} onRetry={retry} />
        </ThemeProvider>
      </body>
    </html>
  );
}
