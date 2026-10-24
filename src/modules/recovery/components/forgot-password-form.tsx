"use client";

import { MailIcon } from "@qeetrix/icons";
import { Button } from "@qeetrix/ui";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, apiPost } from "@/platform/api/client";
import type { Branding } from "@/platform/branding/branding";
import { AuthCard } from "@/platform/components/auth-card";
import { FormAlert } from "@/platform/components/form-alert";
import { IconInput } from "@/platform/components/icon-input";

type ForgotPasswordFormProps = {
  returnTo: string;
  branding?: Branding;
};

export function ForgotPasswordForm({ returnTo, branding }: ForgotPasswordFormProps) {
  const { t } = useTranslation("recovery");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const signInHref = `/sign-in${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""}`;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // app: the emailed link opens this hosted login's reset page (not the
      // console). return_to: where to continue after the reset — the API keeps
      // it only if it is its own /oauth/authorize URL. The response is
      // enumeration-safe either way.
      const body: Record<string, string> = { email, app: "hosted_login" };
      if (returnTo) body.return_to = returnTo;
      await apiPost("/v1/auth/forgot-password", body);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common:errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard branding={branding} title={t("forgot.title")} subtitle={t("forgot.subtitle")}>
      {sent ? (
        <p role="status" className="text-muted-foreground text-center text-sm">
          {t("forgot.sent")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              {t("forgot.label")}
            </label>
            <IconInput
              icon={MailIcon}
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <FormAlert>{error}</FormAlert>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={loading}
            loadingLabel={t("forgot.submit.busy")}
          >
            {t("forgot.submit.idle")}
          </Button>
        </form>
      )}

      <div className="text-center">
        <a
          href={signInHref}
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
        >
          {t("forgot.backToSignIn")}
        </a>
      </div>
    </AuthCard>
  );
}
