"use client";

import "./globals.css";
import "@/i18n";

import { ErrorPage } from "@/platform/components/error-page";

// Replaces the root layout when the layout itself fails, so it brings its own
// document, styles and copy.
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
        <ErrorPage reference={error.digest} onRetry={retry} />
      </body>
    </html>
  );
}
