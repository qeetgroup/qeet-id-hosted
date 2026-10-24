"use client";

import { ErrorPage } from "@/platform/components/error-page";

// Catches a page that fails to render, inside the root layout.
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorPage reference={error.digest} onRetry={retry} />;
}
