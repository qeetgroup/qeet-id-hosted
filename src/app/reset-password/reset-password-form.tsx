"use client";

import { Button, Input, PasswordStrengthMeter } from "@qeetrix/ui";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthCard } from "@/components/auth-card";
import { FormAlert } from "@/components/form-alert";
import { ApiError, apiPost } from "@/lib/api";
import type { Branding } from "@/lib/branding";
import { safeReturnTo } from "@/lib/login-context";

type ResetPasswordFormProps = {
  token: string;
  returnTo: string;
  branding?: Branding;
};

export function ResetPasswordForm({ token, returnTo, branding }: ResetPasswordFormProps) {
  const { t } = useTranslation("recovery");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // After the reset, sign in again — and, when the reset started on the way
  // into an application, continue to it (only our own authorize endpoint).
  const dest = safeReturnTo(returnTo);
  const signInHref = `/sign-in${dest ? `?return_to=${encodeURIComponent(dest)}` : ""}`;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("reset.mismatch"));
      return;
    }
    setLoading(true);
    try {
      await apiPost("/v1/auth/reset-password", {
        token,
        new_password: password,
      });
      setDone(true);
    } catch (err) {
      // The backend enforces length, weak-password and breach checks and returns
      // a clear message; surface it verbatim.
      setError(err instanceof ApiError ? err.message : t("common:errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard branding={branding} title={t("reset.title")} subtitle={t("reset.subtitle")}>
      {done ? (
        <div className="space-y-4 text-center">
          <p role="status" className="text-muted-foreground text-sm">
            {t("reset.done")}
          </p>
          <Button
            render={<a href={signInHref} aria-label={t("reset.goToSignIn")} />}
            size="lg"
            className="w-full"
          >
            {t("reset.goToSignIn")}
          </Button>
        </div>
      ) : !token ? (
        <FormAlert>{t("reset.missingToken")}</FormAlert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              {t("reset.fields.password")}
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {password ? (
              <PasswordStrengthMeter value={password} className="pt-1" />
            ) : (
              <p className="text-muted-foreground text-xs">{t("reset.hint")}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-sm font-medium">
              {t("reset.fields.confirm")}
            </label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={confirm.length > 0 && confirm !== password}
            />
          </div>

          <FormAlert>{error}</FormAlert>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={loading}
            loadingLabel={t("reset.submit.busy")}
          >
            {t("reset.submit.idle")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
