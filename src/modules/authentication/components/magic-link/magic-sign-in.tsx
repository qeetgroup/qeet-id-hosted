"use client";

import { Button } from "@qeetrix/ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MfaChallenge } from "@/modules/authentication/components/mfa/mfa-challenge";
import { MfaEnrollment } from "@/modules/authentication/components/mfa/mfa-enrollment";
import type { LoginFactor } from "@/modules/authentication/session";
import { apiPost } from "@/platform/api/client";
import { apiErrorMessage, isAddressRefusal } from "@/platform/api/errors";
import type { Branding } from "@/platform/branding/branding";
import { AuthCard } from "@/platform/components/auth-card";
import { FormAlert } from "@/platform/components/form-alert";
import { safeReturnTo } from "@/platform/navigation/return-to";

type MagicSignInProps = {
  token: string;
  branding?: Branding;
};

// The magic-link session exchange answers the session (cookie set) or, when
// the account holds a second factor or must have one, a challenge to complete
// first — the link is spent either way.
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

/**
 * Exchanges the emailed one-time link for the hosted sign-in session, then
 * continues the journey it was asked for from. A link that was already used,
 * has expired or no longer works can be replaced from here without typing the
 * address again. Where a second factor is required, its step comes first.
 */
export function MagicSignIn({ token, branding }: MagicSignInProps) {
  const { t } = useTranslation("signIn");
  const [error, setError] = useState<string | null>(token ? null : t("magic.missingToken"));
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  // The organisation's address rules refused this network: nothing on this
  // page (a new link, another method) would help from here.
  const [addressRefused, setAddressRefused] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // One exchange per page load, even under React's double effect in dev.
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
        window.location.href = safeReturnTo(res.return_to ?? "") ?? "/security";
      })
      .catch((err) => {
        setAddressRefused(isAddressRefusal(err));
        setError(apiErrorMessage(err, t, t("common:errors.generic")));
      });
  }, [token, t]);

  async function resend() {
    setResending(true);
    try {
      await apiPost("/v1/auth/magic-link/resend", { token });
      setResent(true);
    } catch (err) {
      setError(apiErrorMessage(err, t, t("common:errors.generic")));
    } finally {
      setResending(false);
    }
  }

  if (challenge) {
    const continueJourney = () => {
      window.location.href = safeReturnTo(challenge.returnTo) ?? "/security";
    };
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
        onBack={() => {
          window.location.href = `/sign-in${challenge.returnTo ? `?return_to=${encodeURIComponent(challenge.returnTo)}` : ""}`;
        }}
      />
    );
  }

  if (!error) {
    return (
      <AuthCard
        branding={branding}
        title={t("magic.signingIn")}
        subtitle={t("magic.signingInText")}
      >
        <p role="status" className="sr-only">
          {t("magic.signingIn")}
        </p>
      </AuthCard>
    );
  }
  if (addressRefused) {
    return (
      <AuthCard branding={branding} title={t("magic.addressTitle")}>
        <FormAlert>{error}</FormAlert>
      </AuthCard>
    );
  }
  return (
    <AuthCard branding={branding} title={t("magic.failedTitle")} subtitle={t("magic.failedText")}>
      <div className="space-y-4">
        <FormAlert>{resent ? null : error}</FormAlert>
        {resent ? (
          <p role="status" className="text-muted-foreground text-center text-sm">
            {t("magic.resent")}
          </p>
        ) : token ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={resend}
            loading={resending}
            loadingLabel={t("magic.busy")}
          >
            {t("magic.resend")}
          </Button>
        ) : null}
        <Button render={<a href="/sign-in" />} variant="outline" className="w-full">
          {t("magic.goToSignIn")}
        </Button>
      </div>
    </AuthCard>
  );
}
