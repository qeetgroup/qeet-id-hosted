"use client";

import { ChevronRightIcon, FingerprintPatternIcon, MailIcon } from "@qeetrix/icons";
import { Button } from "@qeetrix/ui";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MfaChallenge } from "@/modules/authentication/components/mfa/mfa-challenge";
import { MfaEnrollment } from "@/modules/authentication/components/mfa/mfa-enrollment";
import { startPasskeyAutofill } from "@/modules/authentication/passkey-autofill";
import type { LoginFactor, SessionResponse } from "@/modules/authentication/session";
import { readSocialChallenge } from "@/modules/authentication/social-challenge";
import { apiPost } from "@/platform/api/client";
import { ADDRESS_NOT_ALLOWED_REDIRECT, apiErrorMessage } from "@/platform/api/errors";
import { clientIdFromReturnTo } from "@/platform/api/login-context";
import type { Branding } from "@/platform/branding/branding";
import { AuthCard } from "@/platform/components/auth-card";
import { FormAlert } from "@/platform/components/form-alert";
import { IconInput } from "@/platform/components/icon-input";
import { IconPasswordInput } from "@/platform/components/icon-password-input";
import { getApiBaseUrl } from "@/platform/config/public-config";
import { goTo } from "@/platform/navigation/go-to";
import { returnsToDevice, safeReturnTo } from "@/platform/navigation/return-to";
import { shouldOfferPasskey } from "@/platform/webauthn/passkeys";
import { ClientIdentity } from "./client-identity";
import { MagicLinkRequest } from "./magic-link-request";
import { OrDivider } from "./or-divider";
import { PasskeyPrompt } from "./passkey-prompt";
import { SocialProviders } from "./social-providers";

type SignInFormProps = {
  returnTo: string;
  clientName: string;
  // The application's logo and home page, when its registration has them.
  clientLogoUri?: string;
  clientUri?: string;
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

export function SignInForm({
  returnTo,
  clientName,
  clientLogoUri,
  clientUri,
  tenantId,
  providers,
  selfRegistrationEnabled,
  rememberDeviceEnabled,
  passwordEnabled,
  passkeyEnabled,
  magicLinkEnabled,
  errorCode,
  branding,
}: SignInFormProps) {
  const { t } = useTranslation("signIn");
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: started once per form load
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
      const clientId = clientIdFromReturnTo(returnTo);
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
        context={
          clientName ? (
            <ClientIdentity name={clientName} logoUri={clientLogoUri} uri={clientUri} />
          ) : null
        }
        title={t("title")}
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

  async function passkeySignIn() {
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
      setError(apiErrorMessage(err, t, (err as Error).message || t("errors.passkeyFailed")));
      setPasskeyBusy(false);
    }
  }

  const busy = loading || passkeyBusy;
  const showSocial = providers.length > 0 && tenantId !== "" && returnTo !== "";
  const showMagicLink = magicLinkEnabled && tenantId !== "";
  const query = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : "";
  // A device journey carries no client to name yet, so say what the sign-in is for.
  const subtitle = clientName
    ? t("subtitleTo", { client: clientName })
    : returnsToDevice(returnTo)
      ? t("subtitleDevice")
      : t("subtitle");

  return (
    <AuthCard
      branding={branding}
      context={
        clientName ? (
          <ClientIdentity name={clientName} logoUri={clientLogoUri} uri={clientUri} />
        ) : null
      }
      title={t("title")}
      subtitle={subtitle}
    >
      {passkeyEnabled && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full justify-between px-4"
          disabled={busy}
          onClick={passkeySignIn}
          loading={passkeyBusy}
          loadingLabel={t("passkey.busy")}
        >
          <span className="flex items-center gap-3">
            <FingerprintPatternIcon aria-hidden className="size-6" />
            {t("passkey.idle")}
          </span>
          <ChevronRightIcon aria-hidden className="text-muted-foreground size-5" />
        </Button>
      )}

      {passkeyEnabled && passwordEnabled && <OrDivider>{t("emailDivider")}</OrDivider>}

      {passwordEnabled && (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t("fields.email")}
            </label>
            <IconInput
              icon={MailIcon}
              id="email"
              type="email"
              autoComplete="email webauthn"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                {t("fields.password")}
              </label>
              <a
                href={`/forgot-password${query}`}
                className="text-link hover:text-link-hover text-sm font-medium underline-offset-4 hover:underline"
              >
                {t("forgotPassword")}
              </a>
            </div>
            <IconPasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("fields.passwordPlaceholder")}
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
            <ChevronRightIcon aria-hidden data-icon="inline-end" />
          </Button>
        </form>
      )}

      {/* Without the password form, a passkey or social refusal still needs a place to show. */}
      {!passwordEnabled && <FormAlert>{error}</FormAlert>}

      {showMagicLink && (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground mx-auto block text-sm font-medium underline-offset-4 hover:underline"
          disabled={busy}
          onClick={() => {
            stopAutofill.current();
            setError(null);
            setMagicLink(true);
          }}
        >
          {t("magic.link")}
        </button>
      )}

      {showSocial && (
        <SocialProviders providers={providers} disabled={busy} onSelect={socialStart} />
      )}

      {!passwordEnabled && !passkeyEnabled && !showSocial && !showMagicLink && (
        <p className="text-muted-foreground text-center text-sm">{t("noMethods")}</p>
      )}

      {selfRegistrationEnabled && (
        <p className="text-muted-foreground text-center text-sm">
          {t("noAccount")}{" "}
          <a
            href={`/sign-up${query}`}
            className="text-link hover:text-link-hover font-medium underline-offset-4 hover:underline"
          >
            {t("signUp")}
          </a>
        </p>
      )}
    </AuthCard>
  );
}
