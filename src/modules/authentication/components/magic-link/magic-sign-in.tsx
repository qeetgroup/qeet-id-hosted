"use client";

import { Button, LinkButton, Spinner, Text } from "@qeetrix/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { MfaChallenge } from "@/modules/authentication/components/mfa/mfa-challenge";
import { MfaEnrollment } from "@/modules/authentication/components/mfa/mfa-enrollment";
import type { LoginFactor } from "@/modules/authentication/session";
import { apiPost } from "@/platform/api/client";
import { isAddressRefusal } from "@/platform/api/errors";
import type { Branding } from "@/platform/branding/branding";
import { FormAlert } from "@/platform/components/form-alert";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowLeftIcon, MailIcon } from "@/platform/icons";
import { goTo } from "@/platform/navigation/go-to";
import { safeReturnTo } from "@/platform/navigation/return-to";

// The exchange answers the session (cookie set) or, when the account has a second step or must
// set one up, a challenge to complete first. The link is spent either way.
type MagicSessionResponse = {
  return_to?: string;
  mfa_required?: boolean;
  mfa_token?: string;
  factors?: LoginFactor[];
  enrollment_required?: boolean;
  enrollment_due_at?: string;
};

type Challenge = {
  token: string;
  factors: LoginFactor[];
  enrollment: boolean;
  dueAt?: string;
  returnTo: string;
};

type State = "checking" | "failed" | "resent" | "missing" | "network";

/**
 * Where the emailed sign-in link lands: it checks the link, signs this browser in and goes straight
 * on (there is no success page), or says why it can't. A used or expired link gets one answer, as
 * the server doesn't say which, and a new one can be sent to the same address from here.
 */
export function MagicSignIn({ token, branding }: { token: string; branding?: Branding }) {
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
    apiPost<MagicSessionResponse>("/v1/auth/magic-link/session", { token })
      .then((res) => {
        if (res.mfa_required && res.mfa_token) {
          // The challenge token stays in memory only.
          setChallenge({
            token: res.mfa_token,
            factors: res.factors ?? [],
            enrollment: !!res.enrollment_required,
            dueAt: res.enrollment_due_at,
            returnTo: res.return_to ?? "",
          });
          return;
        }
        goTo(safeReturnTo(res.return_to ?? "") ?? "/security");
      })
      .catch((err) => setState(isAddressRefusal(err) ? "network" : "failed"));
  }, [token]);

  async function resend() {
    setResendError(null);
    setResending(true);
    try {
      await apiPost("/v1/auth/magic-link/resend", { token });
      setState("resent");
    } catch {
      setResendError(t("problems.generic.title"));
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
        onBack={() =>
          goTo(
            `/sign-in${challenge.returnTo ? `?return_to=${encodeURIComponent(challenge.returnTo)}` : ""}`,
          )
        }
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
        description={t("magic.failedBody")}
      >
        <FormStack>
          <FormAlert title={resendError} />
          <Button type="button" size="lg" fullWidth icon={MailIcon} loading={resending} onClick={resend}>
            {t("magic.newLink")}
          </Button>
          {other}
        </FormStack>
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
        description={t("magic.resentBody")}
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
      description={t(state === "network" ? "magic.networkBody" : "magic.missingBody")}
    >
      {other}
    </HostedPage>
  );
}
