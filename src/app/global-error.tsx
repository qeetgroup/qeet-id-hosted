"use client";

import "./globals.css";
import "@/i18n";

import { ErrorPage } from "@/platform/components/error-page";
import { Providers } from "@/platform/components/providers";

// Replaces the root layout when the layout itself fails, so it brings its own document, styles,
// copy and theme.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <ErrorPage reference={error.digest} onRetry={retry} />
        </Providers>
      </body>
    </html>
  );
}
