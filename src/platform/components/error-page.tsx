"use client";

import { Button } from "@qeetrix/ui";
import { useTranslation } from "react-i18next";

import { AuthCard } from "./auth-card";
import { AuthShell } from "./auth-shell";

/**
 * Shown when a page fails to render. Never shows the error's own message, which
 * can carry server details; the reference matches the server's log entry.
 */
export function ErrorPage({ reference, onRetry }: { reference?: string; onRetry: () => void }) {
  const { t } = useTranslation("common");
  return (
    <AuthShell>
      <AuthCard title={t("errorPage.title")} subtitle={t("errorPage.body")}>
        <Button size="lg" className="w-full" onClick={onRetry}>
          {t("errorPage.retry")}
        </Button>
        {reference && (
          <p className="text-muted-foreground text-center text-xs">
            {t("errorPage.reference", { reference })}
          </p>
        )}
      </AuthCard>
    </AuthShell>
  );
}
