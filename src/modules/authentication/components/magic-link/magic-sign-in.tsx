"use client";

import { Spinner, Text } from "@qeetrix/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { resendSignInLink, tradeSignInLink } from "@/modules/authentication/api/magic-link";
import { challengeOf, type LoginFactor } from "@/modules/authentication/api/session";
import { MfaChallenge } from "@/modules/authentication/components/mfa/mfa-challenge";
import { MfaEnrollment } from "@/modules/authentication/components/mfa/mfa-enrollment";
import { isAddressRefusal, isSsoRequired } from "@/platform/api/errors";
import type { Branding } from "@/platform/branding/branding";
import { HostedPage } from "@/platform/components/hosted-page";
import { goTo } from "@/platform/navigation/go-to";
import { safeReturnTo } from "@/platform/navigation/return-to";

import { LinkOutcome } from "./link-outcome";

type Challenge = {
  token: string;
  factors: LoginFactor[];
  enrollment: boolean;
  dueAt?: string;
  returnTo: string;
};

export type State = "checking" | "failed" | "resent" | "missing" | "network" | "sso";

// Why the link couldn't sign in: a network the organisation refuses, an address its organisation
// now signs in itself (the link stays unused), or a link that is used or too old.
function refusedState(err: unknown): State {
  if (isAddressRefusal(err)) return "network";
  if (isSsoRequired(err)) return "sso";
  return "failed";
}

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
  returnTo = "",
}: Readonly<{
  token: string;
  linkMinutes?: number;
  orgName?: string;
  branding?: Branding;
  /** The link's return_to, kept on "Sign in another way" so the application's journey goes on. */
  returnTo?: string;
}>) {
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
      .catch((err) => setState(refusedState(err)));
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

  return (
    <LinkOutcome
      state={state}
      linkMinutes={linkMinutes}
      orgName={orgName}
      resending={resending}
      resendError={resendError}
      branding={branding}
      returnTo={returnTo}
      onResend={() => void resend()}
    />
  );
}
