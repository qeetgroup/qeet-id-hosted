"use client";

import { Button } from "@qeetrix/ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthCard } from "@/components/auth-card";
import { FormAlert } from "@/components/form-alert";
import { ApiError, apiPost } from "@/lib/api";
import type { Branding } from "@/lib/branding";
import { safeReturnTo } from "@/lib/login-context";

type MagicSignInProps = {
  token: string;
  branding?: Branding;
};

/**
 * Exchanges the emailed one-time link for the hosted sign-in session, then
 * continues the journey it was asked for from. A link that was already used,
 * has expired or no longer works can be replaced from here without typing the
 * address again.
 */
export function MagicSignIn({ token, branding }: MagicSignInProps) {
  const { t } = useTranslation("login");
  const [error, setError] = useState<string | null>(token ? null : t("magic.missingToken"));
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // One exchange per page load, even under React's double effect in dev.
    if (!token || started.current) return;
    started.current = true;
    apiPost<{ return_to?: string }>("/v1/auth/magic-link/session", { token })
      .then((res) => {
        window.location.href = safeReturnTo(res.return_to ?? "") ?? "/security";
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t("common:errors.generic"));
      });
  }, [token, t]);

  async function resend() {
    setResending(true);
    try {
      await apiPost("/v1/auth/magic-link/resend", { token });
      setResent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common:errors.generic"));
    } finally {
      setResending(false);
    }
  }

  if (!error) {
    return (
      <AuthCard branding={branding} title={t("magic.signingIn")} subtitle={t("magic.signingInText")}>
        <p role="status" className="sr-only">
          {t("magic.signingIn")}
        </p>
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
          <Button type="button" size="lg" className="w-full" onClick={resend} loading={resending} loadingLabel={t("magic.busy")}>
            {t("magic.resend")}
          </Button>
        ) : null}
        <Button render={<a href="/login" />} variant="outline" className="w-full">
          {t("magic.goToLogin")}
        </Button>
      </div>
    </AuthCard>
  );
}
