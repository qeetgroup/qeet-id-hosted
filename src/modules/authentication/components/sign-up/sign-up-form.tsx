"use client";

import { FingerprintPatternIcon } from "@qeetrix/icons";
import { Button, Input, PasswordStrengthMeter } from "@qeetrix/ui";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { MfaEnrollment } from "@/modules/authentication/components/mfa/mfa-enrollment";
import { apiPost } from "@/platform/api/client";
import { apiErrorMessage } from "@/platform/api/errors";
import type { Branding } from "@/platform/branding/branding";
import { AuthCard } from "@/platform/components/auth-card";
import { FormAlert } from "@/platform/components/form-alert";
import { goTo } from "@/platform/navigation/go-to";
import { safeReturnTo } from "@/platform/navigation/return-to";

type SignUpFormProps = {
  returnTo: string;
  clientName: string;
  tenantId: string;
  selfRegistrationEnabled: boolean;
  branding?: Branding;
};

export function SignUpForm({
  returnTo,
  clientName,
  tenantId,
  selfRegistrationEnabled,
  branding,
}: SignUpFormProps) {
  const { t } = useTranslation("signUp");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  // Passkeys-first: the primary path is a passkey with no password field at
  // all; "Use a password instead" reveals the fallback form below.
  const [usePassword, setUsePassword] = useState(false);
  // Set when the organisation requires MFA: the new account sets up an
  // authenticator app before its session (the challenge token stays in memory).
  const [enrollment, setEnrollment] = useState<{ token: string; dueAt?: string } | null>(null);

  const signInHref = `/sign-in${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""}`;
  const busy = loading || passkeyBusy;

  function continueToApp() {
    goTo(safeReturnTo(returnTo) ?? "/sign-in");
  }

  async function passkeySignUp() {
    setError(null);
    setPasskeyBusy(true);
    try {
      const PK = window.PublicKeyCredential as
        | (typeof window.PublicKeyCredential & {
            parseCreationOptionsFromJSON?: (o: unknown) => PublicKeyCredentialCreationOptions;
          })
        | undefined;
      if (!PK || !navigator.credentials) {
        throw new Error(t("errors.passkeyUnsupported"));
      }
      const begin = await apiPost<{ session_id: string; publicKey: unknown }>(
        "/v1/register/passkey/begin",
        { tenant_id: tenantId, email, display_name: name },
      );
      const options = PK.parseCreationOptionsFromJSON
        ? PK.parseCreationOptionsFromJSON(begin.publicKey)
        : (begin.publicKey as PublicKeyCredentialCreationOptions);
      const created = (await navigator.credentials.create({
        publicKey: options,
      })) as PublicKeyCredential & { toJSON?: () => unknown };
      if (!created) throw new Error(t("errors.passkeyFailed"));
      const credential = created.toJSON ? created.toJSON() : created;
      await apiPost("/v1/register/passkey/finish", {
        session_id: begin.session_id,
        credential,
        name: "",
      });
      continueToApp();
    } catch (err) {
      setError(apiErrorMessage(err, t, (err as Error).message || t("errors.passkeyFailed")));
      setPasskeyBusy(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }
    setLoading(true);
    try {
      // Registration is tenant-scoped: the user is created in the client's
      // tenant and the SSO cookie is set, so we continue straight to the app —
      // unless the organisation requires MFA, when the account sets up an
      // authenticator app first.
      const res = await apiPost<{
        mfa_required?: boolean;
        mfa_token?: string;
        enrollment_due_at?: string;
      }>("/v1/auth/register", { tenant_id: tenantId, email, password, display_name: name });
      if (res.mfa_required && res.mfa_token) {
        setEnrollment({ token: res.mfa_token, dueAt: res.enrollment_due_at });
        setLoading(false);
        return;
      }
      continueToApp();
    } catch (err) {
      setError(apiErrorMessage(err, t, t("common:errors.generic")));
      setLoading(false);
    }
  }

  if (enrollment) {
    return (
      <MfaEnrollment
        mfaToken={enrollment.token}
        dueAt={enrollment.dueAt}
        branding={branding}
        onDone={continueToApp}
      />
    );
  }

  return (
    <AuthCard
      branding={branding}
      title={clientName ? t("titleTo", { client: clientName }) : t("title")}
      subtitle={t("subtitle")}
    >
      {!selfRegistrationEnabled || !tenantId ? (
        <p role="status" className="text-muted-foreground text-center text-sm">
          {t("disabled")}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              {t("fields.name")}
            </label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              {t("fields.email")}
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email webauthn"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {usePassword && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  {t("fields.password")}
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {password ? (
                  <PasswordStrengthMeter value={password} className="pt-1" />
                ) : (
                  <p className="text-muted-foreground text-xs">{t("hint")}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirm" className="text-sm font-medium">
                  {t("fields.confirm")}
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
                disabled={busy}
                loading={loading}
                loadingLabel={t("submit.busy")}
              >
                {t("submit.idle")}
              </Button>
            </form>
          )}

          {!usePassword && (
            <>
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={busy || !email}
                onClick={passkeySignUp}
                loading={passkeyBusy}
                loadingLabel={t("passkey.busy")}
              >
                <FingerprintPatternIcon className="mr-2 size-4" /> {t("passkey.idle")}
              </Button>
              <FormAlert>{error}</FormAlert>
            </>
          )}

          <button
            type="button"
            className="text-muted-foreground hover:text-foreground w-full text-center text-sm underline-offset-2 hover:underline"
            disabled={busy}
            onClick={() => {
              setUsePassword((v) => !v);
              setError(null);
            }}
          >
            {usePassword ? t("usePasskey") : t("usePassword")}
          </button>
        </div>
      )}

      <p className="text-muted-foreground text-center text-sm">
        {t("haveAccount")}{" "}
        <a
          href={signInHref}
          className="text-foreground font-medium underline-offset-2 hover:underline"
        >
          {t("signIn")}
        </a>
      </p>
    </AuthCard>
  );
}
