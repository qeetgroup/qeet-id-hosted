"use client";

import { Button } from "@qeetrix/react";
import { CopyField } from "@qeetrix/react/experimental";
import { useTranslation } from "react-i18next";

import { RotateCwIcon } from "@/platform/icons";

import { HostedPage } from "./hosted-page";

/**
 * When a page can't load: say so without blame, offer Try again (the same page, so the person
 * keeps where they were going), and give the reference support can look up. Never shows the
 * error's own message, which can carry server details; the reference matches the server's log.
 */
export function ErrorPage({ reference, onRetry }: { reference?: string; onRetry: () => void }) {
  const { t } = useTranslation("common");
  return (
    <HostedPage
      single
      status="danger"
      title={t("errorPage.title")}
      description={t("errorPage.body")}
    >
      <div className="flex flex-col gap-5">
        <Button size="lg" fullWidth icon={RotateCwIcon} onClick={onRetry}>
          {t("errorPage.retry")}
        </Button>
        {reference && (
          <CopyField
            label={t("errorPage.reference")}
            value={reference}
            description={t("errorPage.referenceHelp")}
          />
        )}
      </div>
    </HostedPage>
  );
}
