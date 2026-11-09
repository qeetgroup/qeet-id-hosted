"use client";

import { Button, Field, Link, TextField } from "@qeetrix/react";
import { PasswordInput } from "@qeetrix/react/experimental";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { MfaEnrollment } from "@/modules/authentication/components/mfa/mfa-enrollment";
import { ApiError, apiPost } from "@/platform/api/client";
import { isAddressRefusal, isPasswordRefusal } from "@/platform/api/errors";
import type { Branding } from "@/platform/branding/branding";
import { AppLine } from "@/platform/components/app-line";
import { FormAlert } from "@/platform/components/form-alert";
import { AsideLine, FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowRightIcon, KeyRoundIcon } from "@/platform/icons";
import { goTo } from "@/platform/navigation/go-to";
import { safeReturnTo } from "@/platform/navigation/return-to";

type SignUpFormProps = {
  returnTo: string;
  clientName: string;
  clientLogoUri?: string;
  tenantId: string;
  selfRegistrationEnabled: boolean;
  branding?: Branding;
};

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
  tenantId,
  selfRegistrationEnabled,
  branding,
}: SignUpFormProps) {
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

  const signInHref = `/sign-in${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""}`;
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
    return { title: err instanceof ApiError ? err.message : ts("problems.generic.title") };
  }

  async function withPasskey(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const PK = window.PublicKeyCredential as
        | (typeof window.PublicKeyCredential & {
            parseCreationOptionsFromJSON?: (o: unknown) => PublicKeyCredentialCreationOptions;
          })
        | undefined;
      if (!PK || !navigator.credentials) throw new DOMException("unsupported", "NotSupportedError");
      const begin = await apiPost<{ session_id: string; publicKey: unknown }>(
        "/v1/register/passkey/begin",
        { tenant_id: tenantId, email, display_name: name },
      );
      const options = PK.parseCreationOptionsFromJSON
        ? PK.parseCreationOptionsFromJSON(begin.publicKey)
        : (begin.publicKey as PublicKeyCredentialCreationOptions);
      const created = (await navigator.credentials.create({ publicKey: options })) as
        | (PublicKeyCredential & { toJSON?: () => unknown })
        | null;
      if (!created) throw new DOMException("cancelled", "NotAllowedError");
      await apiPost("/v1/register/passkey/finish", {
        session_id: begin.session_id,
        credential: created.toJSON ? created.toJSON() : created,
        name: "",
      });
      continueToApp();
    } catch (err) {
      setError(
        err instanceof DOMException
          ? { title: t("failedTitle"), body: t("failedBody") }
          : refusal(err),
      );
      setBusy(false);
    }
  }

  async function withPasswordSubmit(e: FormEvent<HTMLFormElement>) {
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
      const res = await apiPost<{
        mfa_required?: boolean;
        mfa_token?: string;
        enrollment_due_at?: string;
      }>("/v1/auth/register", { tenant_id: tenantId, email, password, display_name: name });
      if (res.mfa_required && res.mfa_token) {
        setEnrollment({ token: res.mfa_token, dueAt: res.enrollment_due_at });
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
        branding={branding}
        onDone={continueToApp}
      />
    );
  }

  if (!selfRegistrationEnabled || !tenantId) {
    return (
      <HostedPage single branding={branding} title={t("title")} lead={lead}>
        <FormStack>
          <FormAlert tone="info" title={t("closedTitle")}>
            {clientName ? t("closedBody", { client: clientName }) : t("closedBodyNoClient")}
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
