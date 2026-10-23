"use client";

import { FingerprintPatternIcon } from "@qeetrix/icons";
import { Button, Input, Separator } from "@qeetrix/ui";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthCard } from "@/components/auth-card";
import { FormAlert } from "@/components/form-alert";
import { ProviderIcon } from "@/components/social-providers";
import { apiPost } from "@/lib/api";
import { ADDRESS_NOT_ALLOWED_REDIRECT, apiErrorMessage } from "@/lib/errors";
import { clientIDFromReturnTo, returnsToDevice, safeReturnTo } from "@/lib/login-context";
import { goTo } from "@/lib/navigation";
import { startPasskeyAutofill } from "@/lib/passkey-autofill";
import { shouldOfferPasskey } from "@/lib/passkeys";
import { readSocialChallenge } from "@/lib/social-challenge";
import { getApiBaseUrl } from "@/lib/public-config";
import type { Branding } from "@/lib/branding";

import { MagicLinkRequest } from "./magic-link-request";
import { MfaChallenge, type LoginFactor } from "@/components/mfa-challenge";
import { MfaEnrollment } from "@/components/mfa-enrollment";
import { PasskeyPrompt } from "./passkey-prompt";

type LoginFormProps = {
  returnTo: string;
  clientName: string;
  tenantId: string;
  providers: string[];
  selfRegistrationEnabled: boolean;
  // rememberDeviceEnabled gates the "remember this device" option on the MFA
  // step (adaptive MFA); true only when the tenant has opted in.
  rememberDeviceEnabled: boolean;
  // passwordEnabled / passkeyEnabled: whether the organisation allows each
  // method; a method it has switched off is not offered (and is refused by the
  // server anyway).
  passwordEnabled: boolean;
  passkeyEnabled: boolean;
  // magicLinkEnabled offers "email me a sign-in link"; true only when the
  // organisation allows magic links.
  magicLinkEnabled: boolean;
  // errorCode seeds the error banner from a redirect (e.g. a failed social
  // ceremony bounced back as ?error=social); empty when there's nothing to show.
  errorCode: string;
  branding?: Branding;
};

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// The hosted-login session endpoint returns either the user id (cookie set) or,
// when the account holds a second factor or must have one, a pending MFA
// challenge to complete. An enrolment challenge (enrollment_required) is met
// by setting up an authenticator app; enrollment_due_at, when present, is the
// end of the organisation's grace period, until which it can be skipped.
export type SessionResponse = {
  user_id?: string;
  mfa_required?: boolean;
  mfa_token?: string;
  methods?: string[];
  factors?: LoginFactor[];
  enrollment_required?: boolean;
  enrollment_due_at?: string;
};


export function LoginForm({
  returnTo,
  clientName,
  tenantId,
  providers,
  selfRegistrationEnabled,
  rememberDeviceEnabled,
  passwordEnabled,
  passkeyEnabled,
  magicLinkEnabled,
  errorCode,
  branding,
}: LoginFormProps) {
  const { t } = useTranslation("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    if (!errorCode) return null;
    // A social sign-in the organisation's address rules refused: the shared
    // network message, not a provider failure with advice to try another way.
    if (errorCode === ADDRESS_NOT_ALLOWED_REDIRECT) return t("common:errors.addressNotAllowed");
    return t(`errors.${errorCode}`, { defaultValue: t("common:errors.generic") });
  });
  const [loading, setLoading] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  // The pending MFA challenge token is held only in memory (never the URL) and,
  // when set, swaps the credential form for the second-factor step.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaFactors, setMfaFactors] = useState<LoginFactor[]>([]);
  // Set for an enrolment challenge: the setup step replaces the factor step.
  const [enrollment, setEnrollment] = useState<{ dueAt?: string } | null>(null);
  // Set after a password sign-in to offer adding a passkey before continuing.
  const [offerPasskey, setOfferPasskey] = useState(false);
  // Asking for a one-time sign-in link instead of using a password.
  const [magicLink, setMagicLink] = useState(false);
  // Stops the background passkey ceremony behind the email field's
  // suggestions; called before signing in any other way.
  const stopAutofill = useRef<() => void>(() => {});

  // Offer the user's passkeys in the browser's own prompt as the form loads.
  // Signing in that way skips the "add a passkey" offer — they have one.
  // Started once per form load.
  useEffect(() => {
    if (!passkeyEnabled) return;
    stopAutofill.current = startPasskeyAutofill(
      () => {
        goTo(safeReturnTo(returnTo) ?? "/security");
      },
      (err) => setError(apiErrorMessage(err, t, t("errors.passkeyFailed"))),
    );
    return () => stopAutofill.current();
  }, []);

  // Back from a social sign-in that must meet a second factor first: take the
  // challenge from the URL fragment into memory, clear the fragment, and go
  // straight to the second-factor step (or the setup of one). After the
  // autofill effect, so the passkey prompt it started is stopped.
  useEffect(() => {
    const challenge = readSocialChallenge(window.location.hash);
    if (!challenge) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    stopAutofill.current();
    setMfaFactors(challenge.factors);
    setEnrollment(challenge.enrollment);
    setMfaToken(challenge.mfaToken);
  }, []);

  // Back to the application; with none to return to, on to the signed-in
  // security page (where the user can add a passkey).
  function continueToApp() {
    goTo(safeReturnTo(returnTo) ?? "/security");
  }

  // After a password sign-in (with or without a second factor), offer a passkey
  // when the user could add one and has none; otherwise continue as before.
  // Without an application to return to, the security page offers it instead.
  async function afterPasswordSignIn() {
    if (safeReturnTo(returnTo) && (await shouldOfferPasskey())) {
      setOfferPasskey(true);
      return;
    }
    continueToApp();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    stopAutofill.current();
    setError(null);
    setLoading(true);
    try {
      // Name the app being signed in to, so the sign-in lockout of the
      // organisation that owns it applies (the platform default without one).
      const clientId = clientIDFromReturnTo(returnTo);
      const res = await apiPost<SessionResponse>("/v1/auth/session", {
        email,
        password,
        ...(clientId ? { client_id: clientId } : {}),
      });
      if (res.mfa_required && res.mfa_token) {
        setMfaFactors(res.factors ?? []);
        setEnrollment(res.enrollment_required ? { dueAt: res.enrollment_due_at } : null);
        setMfaToken(res.mfa_token);
        setLoading(false);
        return;
      }
      await afterPasswordSignIn();
    } catch (err) {
      setError(apiErrorMessage(err, t, t("common:errors.generic")));
      setLoading(false);
    }
  }

  if (offerPasskey) {
    return <PasskeyPrompt branding={branding} onContinue={continueToApp} />;
  }

  if (magicLink) {
    return (
      <AuthCard
        branding={branding}
        title={clientName ? t("titleTo", { client: clientName }) : t("title")}
        subtitle={t("magic.hint")}
      >
        <MagicLinkRequest
          tenantId={tenantId}
          returnTo={returnTo}
          initialEmail={email}
          onBack={() => setMagicLink(false)}
        />
      </AuthCard>
    );
  }

  if (mfaToken && enrollment) {
    return (
      <MfaEnrollment
        mfaToken={mfaToken}
        dueAt={enrollment.dueAt}
        branding={branding}
        onDone={afterPasswordSignIn}
        onBack={() => {
          setMfaToken(null);
          setEnrollment(null);
          setError(null);
        }}
      />
    );
  }

  if (mfaToken) {
    return (
      <MfaChallenge
        mfaToken={mfaToken}
        factors={mfaFactors}
        rememberDeviceEnabled={rememberDeviceEnabled}
        branding={branding}
        onVerified={afterPasswordSignIn}
        onBack={() => {
          setMfaToken(null);
          setError(null);
        }}
      />
    );
  }

  // Social: a full-page redirect into the hosted social flow, which sets the SSO
  // cookie on the provider callback and returns to the authorize URL.
  function socialStart(provider: string) {
    stopAutofill.current();
    const q = new URLSearchParams({ tenant_id: tenantId, return_to: returnTo });
    window.location.assign(`${getApiBaseUrl()}/v1/social/${provider}/start?${q.toString()}`);
  }

  async function passkeyLogin() {
    stopAutofill.current();
    setError(null);
    setPasskeyBusy(true);
    try {
      const PK = window.PublicKeyCredential as
        | (typeof window.PublicKeyCredential & {
            parseRequestOptionsFromJSON?: (o: unknown) => PublicKeyCredentialRequestOptions;
          })
        | undefined;
      if (!PK || !navigator.credentials) {
        throw new Error(t("errors.passkeyUnsupported"));
      }
      const begin = await apiPost<{ session_id: string; publicKey: unknown }>(
        "/v1/passkeys/login/begin",
        {},
      );
      const options = PK.parseRequestOptionsFromJSON
        ? PK.parseRequestOptionsFromJSON(begin.publicKey)
        : (begin.publicKey as PublicKeyCredentialRequestOptions);
      const assertion = (await navigator.credentials.get({
        publicKey: options,
      })) as PublicKeyCredential & {
        toJSON?: () => unknown;
      };
      if (!assertion) throw new Error(t("errors.noPasskeySelected"));
      const credential = assertion.toJSON ? assertion.toJSON() : assertion;
      await apiPost("/v1/passkeys/login/finish", {
        session_id: begin.session_id,
        credential,
      });
      continueToApp();
    } catch (err) {
      setError(
        apiErrorMessage(err, t, (err as Error).message || t("errors.passkeyFailed")),
      );
      setPasskeyBusy(false);
    }
  }

  const busy = loading || passkeyBusy;
  const showSocial = providers.length > 0 && tenantId !== "" && returnTo !== "";
  // A device journey carries no client to name yet, so say what the sign-in is for.
  const title = clientName
    ? t("titleTo", { client: clientName })
    : returnsToDevice(returnTo)
      ? t("titleDevice")
      : t("title");

  return (
    <AuthCard
      branding={branding}
      title={title}
      subtitle={t("subtitle")}
    >
      {passwordEnabled && (
        <form onSubmit={onSubmit} className="space-y-4">
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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                {t("fields.password")}
              </label>
              <a
                href={`/forgot-password${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""}`}
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
              >
                {t("forgotPassword")}
              </a>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

      {passkeyEnabled && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={passkeyLogin}
          loading={passkeyBusy}
          loadingLabel={t("passkey.busy")}
        >
          <>
            <FingerprintPatternIcon className="mr-2 size-4" /> {t("passkey.idle")}
          </>
        </Button>
      )}

      {magicLinkEnabled && tenantId !== "" && (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={() => {
            stopAutofill.current();
            setError(null);
            setMagicLink(true);
          }}
        >
          {t("magic.link")}
        </Button>
      )}

      {showSocial && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {t("social.divider")}
            </span>
            <Separator className="flex-1" />
          </div>
          <div className="grid gap-2">
            {providers.map((p) => (
              <Button
                key={p}
                type="button"
                variant="outline"
                className="w-full justify-center gap-2"
                disabled={busy}
                onClick={() => socialStart(p)}
              >
                <ProviderIcon provider={p} />
                {t(`common:providers.${p}`, { defaultValue: titleCase(p) })}
              </Button>
            ))}
          </div>
        </div>
      )}

      {!passwordEnabled && !passkeyEnabled && !showSocial && !(magicLinkEnabled && tenantId !== "") && (
        <p className="text-muted-foreground text-center text-sm">{t("noMethods")}</p>
      )}

      {selfRegistrationEnabled && (
        <p className="text-muted-foreground text-center text-sm">
          {t("noAccount")}{" "}
          <a
            href={`/signup${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""}`}
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            {t("signUp")}
          </a>
        </p>
      )}
    </AuthCard>
  );
}
