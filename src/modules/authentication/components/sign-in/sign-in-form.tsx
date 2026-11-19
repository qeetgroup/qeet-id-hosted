"use client";

import { Spinner, Text } from "@qeetrix/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  challengeOf,
  type LoginFactor,
  type SessionResponse,
  signInWithPassword,
  tradeHandBack,
} from "@/modules/authentication/api/session";
import { type Company, discover, readHandBack } from "@/modules/authentication/company-sign-in";
import { MfaChallenge } from "@/modules/authentication/components/mfa/mfa-challenge";
import { MfaEnrollment } from "@/modules/authentication/components/mfa/mfa-enrollment";
import { startPasskeyAutofill } from "@/modules/authentication/passkey-autofill";
import { signInWithPasskey } from "@/modules/authentication/passkey-sign-in";
import { readSocialChallenge } from "@/modules/authentication/social-challenge";
import { fetchSignedInAccount } from "@/platform/api/account";
import { ApiError } from "@/platform/api/client";
import { clientIdFromReturnTo } from "@/platform/api/login-context";
import type { Organisation } from "@/platform/api/organisation";
import type { Branding } from "@/platform/branding/branding";
import { AccountChip } from "@/platform/components/account-chip";
import { AppLine } from "@/platform/components/app-line";
import { FormAlert } from "@/platform/components/form-alert";
import { HostedPage } from "@/platform/components/hosted-page";
import { getApiBaseUrl } from "@/platform/config/public-config";
import { goTo } from "@/platform/navigation/go-to";
import { returnsToDevice, safeReturnTo } from "@/platform/navigation/return-to";
import { isCancelled, PasskeyUnsupportedError } from "@/platform/webauthn/ceremony";
import { shouldOfferPasskey } from "@/platform/webauthn/passkeys";

import { type Problem, problemOf, problemOfRedirect } from "../../sign-in-problems";
import { CompanyStep } from "./company-step";
import { EmailStep } from "./email-step";
import { LinkStep } from "./link-step";
import { PasskeyOffer } from "./passkey-offer";
import { PasswordStep } from "./password-step";

export type SignInFormProps = {
  returnTo: string;
  clientName: string;
  clientLogoUri?: string;
  /** The application's organisation; empty when the page has no application. */
  organizationId: string;
  providers: string[];
  selfRegistrationEnabled: boolean;
  /** Offers "remember this device" on the second step; only when the organisation opted in. */
  rememberDeviceEnabled: boolean;
  /** The ways the organisation allows; one it turned off is not offered (and the server refuses it). */
  passwordEnabled: boolean;
  passkeyEnabled: boolean;
  magicLinkEnabled: boolean;
  /** A failed social sign-in sent back as ?error=; empty when there's nothing to say. */
  errorCode: string;
  /** The organisation's name and settings, from the login context. */
  organisation?: Organisation;
  branding?: Branding;
};

type Step = "email" | "password" | "link" | "company" | "finishing" | "mfa" | "offer";

// What the application asked for in its authorize request: a fresh sign-in (prompt=login), and
// the account to sign in (login_hint).
function authorizeHints(returnTo: string): { fresh: boolean; hint: string } {
  try {
    const q = new URL(returnTo).searchParams;
    return {
      fresh: (q.get("prompt") ?? "").split(" ").includes("login"),
      hint: q.get("login_hint") ?? "",
    };
  } catch {
    return { fresh: false, hint: "" };
  }
}

/**
 * Sign in, as the mockups draw it: the email first, then the company's own sign-in when the
 * address's domain uses one, else the way the organisation allows (a password, a sign-in link);
 * or a passkey or social account straight away. Then the second step when the account has one,
 * and once, after a password, the offer of a passkey. Every way on goes through safeReturnTo;
 * without an application to return to, to the passkeys page.
 */
export function SignInForm(props: SignInFormProps) {
  const { returnTo, organizationId, branding } = props;
  const org = props.organisation ?? {};
  const { t } = useTranslation("signIn");
  const hints = authorizeHints(returnTo);
  const again = hints.fresh && hints.hint !== "";
  const [step, setStep] = useState<Step>(again ? "password" : "email");
  const [email, setEmail] = useState(hints.hint);
  const [problem, setProblem] = useState<Problem | null>(() => problemOfRedirect(props.errorCode));
  const [busy, setBusy] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  // Where the address's domain signs in, when it's its company's own sign-in.
  const [company, setCompany] = useState<Company | null>(null);
  // The pending second-step challenge: held in memory only, never in the URL or storage.
  const [mfa, setMfa] = useState<{
    token: string;
    factors: LoginFactor[];
    enrollment: { dueAt?: string } | null;
    /** Met after a company's sign-in, which goes straight on: no passkey offer. */
    company?: boolean;
  } | null>(null);
  // The person's name, for the account a fresh sign-in is asked of, when this browser knows it.
  const [name, setName] = useState<string | undefined>();
  // Stops the background passkey ceremony behind the email field; called before any other way.
  const stopAutofill = useRef<() => void>(() => {});

  const emailEnabled = props.passwordEnabled || (props.magicLinkEnabled && organizationId !== "");
  const providers = organizationId !== "" && returnTo !== "" ? props.providers : [];
  const query = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : "";
  // Qeet ID's own way on from the email, when the organisation allows one.
  const ownWay: Step | null = props.passwordEnabled
    ? "password"
    : props.magicLinkEnabled && organizationId !== ""
      ? "link"
      : null;
  const forgotHref = `/forgot-password${query}`;

  function continueToApp() {
    goTo(safeReturnTo(returnTo) ?? "/security");
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: started once per page load
  useEffect(() => {
    if (!props.passkeyEnabled) return;
    stopAutofill.current = startPasskeyAutofill(continueToApp, (err) => setProblem(problemOf(err)));
    return () => stopAutofill.current();
  }, []);

  useEffect(() => {
    if (!again) return;
    void fetchSignedInAccount().then((account) => {
      if (account?.name && account.email.toLowerCase() === hints.hint.toLowerCase())
        setName(account.name);
    });
  }, [again, hints.hint]);

  // Back from a social sign-in that must meet a second step first: the challenge comes in the
  // URL fragment, which is cleared at once, and is then held in memory like any other.
  useEffect(() => {
    const challenge = readSocialChallenge(window.location.hash);
    if (!challenge) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    stopAutofill.current();
    setMfa({
      token: challenge.mfaToken,
      factors: challenge.factors,
      enrollment: challenge.enrollment,
    });
    setStep("mfa");
  }, []);

  // Back from a company's sign-in: its identity provider handed a one-time code back in the URL
  // fragment, which is cleared at once and traded for the session; then on to return_to.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once per page load
  useEffect(() => {
    const back = readHandBack(window.location.hash);
    if (!back) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    stopAutofill.current();
    setStep("finishing");
    tradeHandBack(back)
      .then(onCompanySession)
      .catch((err) => {
        const p = problemOf(err);
        setProblem(p.kind === "server" || p.kind === "generic" ? { kind: "company" } : p);
        setStep("email");
      });
  }, []);

  // After a password or a second step: offer a passkey once, when the person could add one and
  // has none; otherwise on to the application.
  async function afterPasswordSignIn() {
    if (safeReturnTo(returnTo) && (await shouldOfferPasskey())) {
      setStep("offer");
      return;
    }
    continueToApp();
  }

  // The company's own sign-in, when the address's domain uses one.
  async function toCompany(address: string): Promise<boolean> {
    const found = await discover(address);
    if (!found) return false;
    setCompany(found);
    setStep("company");
    return true;
  }

  async function onContinue(address: string) {
    stopAutofill.current();
    setProblem(null);
    setEmail(address);
    setContinuing(true);
    const routed = await toCompany(address);
    setContinuing(false);
    if (!routed) setStep(props.passwordEnabled ? "password" : "link");
  }

  // A company directory's answer: signed in, or a second step to meet first.
  function onCompanySession(res: SessionResponse) {
    const challenge = challengeOf(res);
    if (challenge) {
      setMfa({
        token: challenge.mfa_token,
        factors: challenge.factors ?? [],
        enrollment: challenge.enrollment_required ? { dueAt: challenge.enrollment_due_at } : null,
        company: true,
      });
      setStep("mfa");
      return;
    }
    continueToApp();
  }

  async function onPassword(password: string) {
    setProblem(null);
    setBusy(true);
    try {
      // Naming the application applies its organisation's lockout (the platform's without one).
      const res = await signInWithPassword({
        email,
        password,
        clientId: clientIdFromReturnTo(returnTo),
      });
      const challenge = challengeOf(res);
      if (challenge) {
        setMfa({
          token: challenge.mfa_token,
          factors: challenge.factors ?? [],
          enrollment: challenge.enrollment_required ? { dueAt: challenge.enrollment_due_at } : null,
        });
        setStep("mfa");
        setBusy(false);
        return;
      }
      await afterPasswordSignIn();
    } catch (err) {
      // An address its company signs in itself: on to that sign-in.
      if (err instanceof ApiError && err.code === "auth.sso_required" && (await toCompany(email))) {
        setBusy(false);
        return;
      }
      setProblem(problemOf(err));
      setBusy(false);
    }
  }

  async function onPasskey() {
    stopAutofill.current();
    setProblem(null);
    setPasskeyBusy(true);
    try {
      await signInWithPasskey();
      continueToApp();
    } catch (err) {
      setProblem(
        err instanceof PasskeyUnsupportedError
          ? { kind: "passkeyUnsupported" }
          : isCancelled(err) || err instanceof DOMException
            ? { kind: "passkey" }
            : problemOf(err),
      );
      setPasskeyBusy(false);
    }
  }

  // Social: a full-page visit to the server's social flow for the organisation's own providers,
  // which sets the session on the provider's callback and returns to the authorize URL.
  function onProvider(provider: string) {
    stopAutofill.current();
    const q = new URLSearchParams({ organization_id: organizationId, return_to: returnTo });
    goTo(`${getApiBaseUrl()}/v1/social/${encodeURIComponent(provider)}/start?${q.toString()}`);
  }

  function backToEmail() {
    setProblem(null);
    setStep("email");
  }

  if (step === "finishing") {
    return (
      <HostedPage single branding={branding} title={t("company.finishing")}>
        <div role="status" className="flex items-center gap-3 py-2">
          <Spinner size="md" tone="brand" decorative />
          <Text size="md" tone="subtle">
            {t("company.finishingBody")}
          </Text>
        </div>
      </HostedPage>
    );
  }

  if (step === "company" && company) {
    return (
      <CompanyStep
        email={email}
        company={company}
        returnTo={returnTo}
        branding={branding}
        onOther={ownWay ? () => setStep(ownWay) : undefined}
        onChangeEmail={backToEmail}
        onSession={onCompanySession}
      />
    );
  }

  if (step === "offer") {
    return <PasskeyOffer email={email} branding={branding} onContinue={continueToApp} />;
  }

  if (step === "mfa" && mfa) {
    return mfa.enrollment ? (
      <MfaEnrollment
        mfaToken={mfa.token}
        dueAt={mfa.enrollment.dueAt}
        email={email || undefined}
        orgName={org.name}
        branding={branding}
        onDone={mfa.company ? continueToApp : afterPasswordSignIn}
      />
    ) : (
      <MfaChallenge
        mfaToken={mfa.token}
        factors={mfa.factors}
        email={email || undefined}
        rememberDeviceEnabled={props.rememberDeviceEnabled}
        rememberDays={org.rememberDays}
        branding={branding}
        onVerified={mfa.company ? continueToApp : afterPasswordSignIn}
      />
    );
  }

  if (step === "link") {
    return (
      <LinkStep
        email={email}
        organizationId={organizationId}
        returnTo={returnTo}
        linkMinutes={org.linkMinutes}
        branding={branding}
        onChangeEmail={backToEmail}
        onUsePassword={props.passwordEnabled ? () => setStep("password") : undefined}
        onBack={backToEmail}
      />
    );
  }

  const appLine = props.clientName ? (
    <AppLine name={props.clientName} logoUri={props.clientLogoUri} />
  ) : undefined;

  if (step === "password") {
    const linkAllowed = props.magicLinkEnabled && organizationId !== "";
    return (
      <HostedPage
        branding={branding}
        title={again ? t("again.title") : t("password.title")}
        description={
          again
            ? props.clientName
              ? t("again.body", { client: props.clientName })
              : t("again.bodyNoClient")
            : undefined
        }
        lead={
          again ? (
            <AccountChip email={email} name={name} />
          ) : (
            <AccountChip email={email} action={t("password.change")} onAction={backToEmail} />
          )
        }
      >
        <PasswordStep
          email={email}
          forgotHref={again ? undefined : forgotHref}
          org={org.name}
          problem={problem}
          busy={busy}
          onSubmit={onPassword}
          onLink={!again && linkAllowed ? () => setStep("link") : undefined}
          onPasskey={again && props.passkeyEnabled ? onPasskey : undefined}
        />
      </HostedPage>
    );
  }

  if (!emailEnabled && !props.passkeyEnabled && providers.length === 0) {
    return (
      <HostedPage single branding={branding} title={t("title")} lead={appLine}>
        <FormAlert tone="info" title={t("none.title")}>
          {props.clientName && org.name
            ? t("none.bodyOrg", { client: props.clientName, org: org.name })
            : props.clientName
              ? t("none.body", { client: props.clientName })
              : t("none.bodyNoClient")}
        </FormAlert>
      </HostedPage>
    );
  }

  return (
    <HostedPage
      branding={branding}
      title={t("title")}
      description={!appLine && returnsToDevice(returnTo) ? t("device") : undefined}
      lead={appLine}
    >
      <EmailStep
        email={email}
        emailEnabled={emailEnabled}
        passkeyEnabled={props.passkeyEnabled}
        providers={providers}
        signUpHref={props.selfRegistrationEnabled ? `/sign-up${query}` : undefined}
        forgotHref={forgotHref}
        org={org.name}
        problem={problem}
        passkeyBusy={passkeyBusy}
        continuing={continuing}
        onContinue={onContinue}
        onPasskey={onPasskey}
        onProvider={onProvider}
      />
    </HostedPage>
  );
}
