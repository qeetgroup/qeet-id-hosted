"use client";

import { Button, LinkButton } from "@qeetrix/react";
import { useTranslation } from "react-i18next";

import type { Branding } from "@/platform/branding/branding";
import { FormAlert } from "@/platform/components/form-alert";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowLeftIcon, MailIcon } from "@/platform/icons";
import { safeReturnTo, withReturnTo } from "@/platform/navigation/return-to";

import type { State } from "./magic-sign-in";

/**
 * Why an emailed sign-in link didn't sign in, and what to do: send a new one (used or too old),
 * the organisation's own sign-in, the organisation's networks, or a link opened incomplete.
 */
export function LinkOutcome({
  state,
  linkMinutes,
  orgName,
  resending,
  resendError,
  branding,
  returnTo = "",
  onResend,
}: Readonly<{
  state: Exclude<State, "checking">;
  linkMinutes?: number;
  orgName?: string;
  resending: boolean;
  resendError: string | null;
  branding?: Branding;
  /** Kept on "Sign in another way" when it is a return address the sign-in page accepts. */
  returnTo?: string;
  onResend: () => void;
}>) {
  const { t } = useTranslation("signIn");
  const signInHref = withReturnTo("/sign-in", safeReturnTo(returnTo) ? returnTo : "");
  const other = (
    <LinkButton href={signInHref} variant="ghost" size="lg" fullWidth icon={ArrowLeftIcon}>
      {t("magic.other")}
    </LinkButton>
  );

  if (state === "failed") {
    return (
      <HostedPage
        single
        status="danger"
        branding={branding}
        title={t("magic.failedTitle")}
        description={
          linkMinutes
            ? t("magic.failedBodyMinutes", { minutes: linkMinutes })
            : t("magic.failedBody")
        }
      >
        <FormStack>
          <FormAlert title={resendError} />
          <Button
            type="button"
            size="lg"
            fullWidth
            icon={MailIcon}
            loading={resending}
            onClick={onResend}
          >
            {t("magic.newLink")}
          </Button>
          {other}
        </FormStack>
      </HostedPage>
    );
  }

  if (state === "sso") {
    return (
      <HostedPage
        single
        status="warning"
        branding={branding}
        title={t("problems.sso.title")}
        description={orgName ? t("problems.sso.bodyOrg", { org: orgName }) : t("problems.sso.body")}
      >
        {other}
      </HostedPage>
    );
  }

  if (state === "resent") {
    return (
      <HostedPage
        single
        status="success"
        branding={branding}
        title={t("magic.resentTitle")}
        description={
          linkMinutes
            ? t("magic.resentBodyMinutes", { minutes: linkMinutes })
            : t("magic.resentBody")
        }
      >
        {other}
      </HostedPage>
    );
  }

  let description = t("magic.missingBody");
  if (state === "network") {
    description = orgName ? t("magic.networkBodyOrg", { org: orgName }) : t("magic.networkBody");
  }
  return (
    <HostedPage
      single
      status="warning"
      branding={branding}
      title={t(state === "network" ? "magic.networkTitle" : "magic.missingTitle")}
      description={description}
    >
      {other}
    </HostedPage>
  );
}
