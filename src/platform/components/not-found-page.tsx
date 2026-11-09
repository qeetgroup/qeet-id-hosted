"use client";

import { LinkButton } from "@qeetrix/react";
import { useTranslation } from "react-i18next";

import { LogInIcon } from "@/platform/icons";

import { HostedPage } from "./hosted-page";

/** An address that isn't a page here: say so, in the same frame, and offer the way in. */
export function NotFoundPage() {
  const { t } = useTranslation("common");
  return (
    <HostedPage single status="info" title={t("notFound.title")} description={t("notFound.body")}>
      <LinkButton href="/sign-in" size="lg" fullWidth icon={LogInIcon}>
        {t("notFound.action")}
      </LinkButton>
    </HostedPage>
  );
}
