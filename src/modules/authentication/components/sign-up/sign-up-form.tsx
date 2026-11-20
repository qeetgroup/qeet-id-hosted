"use client";

import { Button, Field, Link, TextField } from "@qeetrix/react";
import { PasswordInput } from "@qeetrix/react/experimental";
import type { TFunction } from "i18next";
import { type SubmitEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { challengeOf } from "@/modules/authentication/api/session";
import {
  beginPasskeySignUp,
  finishPasskeySignUp,
  signUpWithPassword,
} from "@/modules/authentication/api/sign-up";
import { MfaEnrollment } from "@/modules/authentication/components/mfa/mfa-enrollment";
import { ApiError } from "@/platform/api/client";
import { isAddressRefusal, isPasswordRefusal, isSsoRequired } from "@/platform/api/errors";
import type { Organisation } from "@/platform/api/organisation";
import type { Branding } from "@/platform/branding/branding";
import { AppLine } from "@/platform/components/app-line";
import { FormAlert } from "@/platform/components/form-alert";
import { AsideLine, FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { PasswordRules } from "@/platform/components/password-rules";
import { ArrowRightIcon, KeyRoundIcon } from "@/platform/icons";
import { goTo } from "@/platform/navigation/go-to";
import { safeReturnTo, withReturnTo } from "@/platform/navigation/return-to";
import {
  createCredential,
  isCancelled,
  PasskeyUnsupportedError,
} from "@/platform/webauthn/ceremony";

type SignUpFormProps = {
  returnTo: string;
  clientName: string;
  clientLogoUri?: string;
  /** The application's organisation, where the account is made; empty without an application. */
  organizationId: string;
  selfRegistrationEnabled: boolean;
  organisation?: Organisation;
  branding?: Branding;
};

// Why sign-up is closed, naming the application and its organisation when known.
function closedBody(t: TFunction<"signUp">, clientName: string, org?: string): string {
  if (clientName && org) return t("closedBodyOrg", { client: clientName, org });
  if (clientName) return t("closedBody", { client: clientName });
  return t("closedBodyNoClient");
}

/**
 * A new account in the application's organisation: passkey first, with no password at all, or a
 * password the organisation's rules accept. Only when the organisation lets people sign themselves
 * up; otherwise the page says how to get an invitation. The server re-checks both. If the
 * organisation requires a second step, its setup follows; then the application.
 */
export function SignUpForm({
  returnTo,
  clientName,
  clientLogoUri,
  organizationId,
  selfRegistrationEnabled,
  organisation,
  branding,
}: Readonly<SignUpFormProps>) {
  const { t } = useTranslation("signUp");
  const { t: ts } = useTranslation("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [withPassword, setWithPassword] = useState(false);
  const [error, setError] = useState<{ title: string; body?: string } | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [busy, setBusy] = useState(false);
  // Set when the organisation requires a second step: the new account sets one up first. The
  // challenge token stays in memory.
  const [enrollment, setEnrollment] = useState<{ token: string; dueAt?: string } | null>(null);

  const signInHref = withReturnTo("/sign-in", returnTo);
  const lead = clientName ? <AppLine name={clientName} logoUri={clientLogoUri} /> : undefined;
  const signIn = (
    <AsideLine>
      {t("haveAccount")}
      <Link href={signInHref}>{t("signIn")}</Link>
    </AsideLine>
  );

  function continueToApp() {
    goTo(safeReturnTo(returnTo) ?? "/sign-in");
  }

  function refusal(err: unknown): { title: string; body?: string } {
    if (isAddressRefusal(err)) {
      return { title: ts("problems.network.title"), body: ts("problems.network.body") };
    }
    // The address's organisation signs its people in itself: no account is made here.
    if (isSsoRequired(err)) {
      return {
        title: ts("problems.sso.title"),
        body: organisation?.name
          ? ts("problems.sso.bodyOrg", { org: organisation.name })
          : ts("problems.sso.body"),
      };
    }
    return { title: err instanceof ApiError ? err.message : ts("problems.generic.title") };
  }

  async function withPasskey(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // A taken address isn't refused here: the server answers the same either way, and refuses it
      // neutrally once the passkey is made.
      const begin = await beginPasskeySignUp({ organizationId, email, name });
      const credential = await createCredential(begin.publicKey);
      await finishPasskeySignUp(begin.sessionId, credential);
      continueToApp();
    } catch (err) {
      setError(
        isCancelled(err) || err instanceof PasskeyUnsupportedError || err instanceof DOMException
          ? { title: t("failedTitle"), body: t("failedBody") }
          : refusal(err),
      );
      setBusy(false);
    }
  }

  async function withPasswordSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setBusy(true);
    try {
      // The account is made in the application's organisation and signed in; unless the
      // organisation requires a second step, which it sets up first.
      const res = await signUpWithPassword({ organizationId, email, password, name });
      const challenge = challengeOf(res);
      if (challenge) {
        setEnrollment({ token: challenge.mfa_token, dueAt: challenge.enrollment_due_at });
        setBusy(false);
        return;
      }
      continueToApp();
    } catch (err) {
      if (isPasswordRefusal(err)) setPasswordError(err.message);
      else setError(refusal(err));
      setBusy(false);
    }
  }

  if (enrollment) {
    return (
      <MfaEnrollment
        mfaToken={enrollment.token}
        dueAt={enrollment.dueAt}
        email={email}
        orgName={organisation?.name}
        branding={branding}
        onDone={continueToApp}
      />
    );
  }

  if (!selfRegistrationEnabled || !organizationId) {
    return (
      <HostedPage single branding={branding} title={t("title")} lead={lead}>
        <FormStack>
          <FormAlert tone="info" title={t("closedTitle")}>
            {closedBody(t, clientName, organisation?.name)}
          </FormAlert>
          {signIn}
        </FormStack>
      </HostedPage>
    );
  }

  return (
    <HostedPage branding={branding} title={t("title")} lead={lead}>
      <form onSubmit={withPassword ? withPasswordSubmit : withPasskey}>
        <FormStack>
          {error && <FormAlert title={error.title}>{error.body}</FormAlert>}
          <TextField
            label={t("fields.name")}
            name="name"
            required
            autoFocus
            autoComplete="name"
            placeholder={t("fields.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <TextField
            label={t("fields.email")}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("fields.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          {withPassword ? (
            <>
              <Field
                label={t("fields.password")}
                invalid={Boolean(passwordError)}
                error={passwordError ?? undefined}
              >
                {(control) => (
                  <PasswordInput
                    {...control}
                    name="new-password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                  />
                )}
              </Field>
              {organisation?.passwordPolicy && (
                <PasswordRules policy={organisation.passwordPolicy} password={password} />
              )}
              <Field
                label={t("fields.confirm")}
                invalid={mismatch}
                error={mismatch ? t("mismatch") : undefined}
              >
                {(control) => (
                  <PasswordInput
                    {...control}
                    name="confirm-password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.currentTarget.value)}
                  />
                )}
              </Field>
              <Button type="submit" size="lg" fullWidth icon={ArrowRightIcon} loading={busy}>
                {busy ? t("submit.busy") : t("submit.idle")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                fullWidth
                disabled={busy}
                onClick={() => setWithPassword(false)}
              >
                {t("usePasskey")}
              </Button>
            </>
          ) : (
            <>
              <Button type="submit" size="lg" fullWidth icon={KeyRoundIcon} loading={busy}>
                {busy ? t("passkey.busy") : t("passkey.idle")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                fullWidth
                disabled={busy}
                onClick={() => setWithPassword(true)}
              >
                {t("usePassword")}
              </Button>
            </>
          )}
          <div className="mt-2">{signIn}</div>
        </FormStack>
      </form>
    </HostedPage>
  );
}
