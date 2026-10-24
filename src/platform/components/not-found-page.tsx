"use client";

import { buttonVariants } from "@qeetrix/ui";
import { useTranslation } from "react-i18next";

import { AuthCard } from "./auth-card";
import { AuthShell } from "./auth-shell";

/** Shown for an address that isn't a page here, with the way back to sign-in. */
export function NotFoundPage() {
  const { t } = useTranslation("common");
  return (
    <AuthShell>
      <AuthCard title={t("notFound.title")} subtitle={t("notFound.body")}>
        <a href="/sign-in" className={buttonVariants({ size: "lg", className: "w-full" })}>
          {t("notFound.action")}
        </a>
      </AuthCard>
    </AuthShell>
  );
}
