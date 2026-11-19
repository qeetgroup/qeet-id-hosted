"use client";

import { Button, LinkButton, Spinner, Text } from "@qeetrix/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { resendSignInLink, tradeSignInLink } from "@/modules/authentication/api/magic-link";
import { challengeOf, type LoginFactor } from "@/modules/authentication/api/session";
import { MfaChallenge } from "@/modules/authentication/components/mfa/mfa-challenge";
import { MfaEnrollment } from "@/modules/authentication/components/mfa/mfa-enrollment";
import { isAddressRefusal, isSsoRequired } from "@/platform/api/errors";
import type { Branding } from "@/platform/branding/branding";
import { FormAlert } from "@/platform/components/form-alert";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowLeftIcon, MailIcon } from "@/platform/icons";
import { goTo } from "@/platform/navigation/go-to";
import { safeReturnTo } from "@/platform/navigation/return-to";

type Challenge = {
  token: string;
  factors: LoginFactor[];
  enrollment: boolean;
  dueAt?: string;
  returnTo: string;
};

type State = "checking" | "failed" | "resent" | "missing" | "network" | "sso";

/**
 * Where the emailed sign-in link lands: it checks the link, signs this browser in and goes straight
 * on (there is no success page), or says why it can't. A used or expired link gets one answer, as
 * the server doesn't say which, and a new one can be sent to the same address from here.
 */
export function MagicSignIn({
  token,
  linkMinutes,
  orgName,
  branding,
}: {
  token: string;
  linkMinutes?: number;
  orgName?: string;
  branding?: Branding;
}) {
  const { t } = useTranslation("signIn");
  const [state, setState] = useState<State>(token ? "checking" : "missing");
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // One exchange per page load, even under React's double effect in development.
    if (!token || started.current) return;
    started.current = true;
    // The exchange answers the session (cookie set) or, when the account has a second step or must
    // set one up, a challenge to complete first. The link is spent either way, except when the
    // address must now sign in through its organisation: that link stays unused.
    tradeSignInLink(token)
      .then((res) => {
        const pending = challengeOf(res);
        if (pending) {
          // The challenge token stays in memory only.
          setChallenge({
            token: pending.mfa_token,
            factors: pending.factors ?? [],
            enrollment: !!pending.enrollment_required,
            dueAt: pending.enrollment_due_at,
            returnTo: res.return_to ?? "",
          });
          return;
        }
        goTo(safeReturnTo(res.return_to ?? "") ?? "/security");
      })
      .catch((err) =>
        setState(isAddressRefusal(err) ? "network" : isSsoRequired(err) ? "sso" : "failed"),
      );
  }, [token]);

  async function resend() {
    setResendError(null);
    setResending(true);
    try {
      await resendSignInLink(token);
      setState("resent");
    } catch (err) {
      if (isSsoRequired(err)) setState("sso");
      else setResendError(t("problems.generic.title"));
    } finally {
      setResending(false);
    }
  }

  if (challenge) {
    const continueJourney = () => goTo(safeReturnTo(challenge.returnTo) ?? "/security");
    if (challenge.enrollment) {
      return (
        <MfaEnrollment
          mfaToken={challenge.token}
          dueAt={challenge.dueAt}
          branding={branding}
          onDone={continueJourney}
        />
      );
    }
    return (
      <MfaChallenge
        mfaToken={challenge.token}
        factors={challenge.factors}
        rememberDeviceEnabled={false}
        branding={branding}
        onVerified={continueJourney}
      />
    );
  }

  if (state === "checking") {
    return (
      <HostedPage
        single
        branding={branding}
        title={t("magic.checkingTitle")}
        description={t("magic.checkingBody")}
      >
        <div role="status" className="flex items-center gap-3 py-2">
          <Spinner size="md" tone="brand" decorative />
          <Text size="md" tone="subtle">
            {t("magic.checking")}
          </Text>
        </div>
      </HostedPage>
    );
  }

  const other = (
    <LinkButton href="/sign-in" variant="ghost" size="lg" fullWidth icon={ArrowLeftIcon}>
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
            onClick={resend}
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

  return (
    <HostedPage
      single
      status="warning"
      branding={branding}
      title={t(state === "network" ? "magic.networkTitle" : "magic.missingTitle")}
      description={
        state === "network"
          ? orgName
            ? t("magic.networkBodyOrg", { org: orgName })
            : t("magic.networkBody")
          : t("magic.missingBody")
      }
    >
      {other}
    </HostedPage>
  );
}
