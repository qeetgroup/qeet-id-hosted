"use client";

// The sign-in page's state and what each of its steps does, apart from how they look: the
// email, then the company's own sign-in or the organisation's own way, a passkey or a social
// account, the second step, and the passkey offer. Every way on goes through safeReturnTo.

import { useEffect, useRef, useState } from "react";

import {
  challengeOf,
  type SessionResponse,
  signInWithPassword,
  tradeHandBack,
} from "@/modules/authentication/api/session";
import { type Company, discover, readHandBack } from "@/modules/authentication/company-sign-in";
import { startPasskeyAutofill } from "@/modules/authentication/passkey-autofill";
import { signInWithPasskey } from "@/modules/authentication/passkey-sign-in";
import { readSocialChallenge } from "@/modules/authentication/social-challenge";
import { fetchSignedInAccount } from "@/platform/api/account";
import { isSsoRequired } from "@/platform/api/errors";
import { clientIdFromReturnTo } from "@/platform/api/login-context";
import { goTo } from "@/platform/navigation/go-to";
import { safeReturnTo, withReturnTo } from "@/platform/navigation/return-to";
import { shouldOfferPasskey } from "@/platform/webauthn/passkeys";

import { type Problem, problemOf, problemOfRedirect } from "../../sign-in-problems";
import type { SignInFormProps } from "./sign-in-form";
import {
  authorizeHints,
  handBackProblem,
  type Pending,
  passkeyProblem,
  pendingOf,
  type Step,
  socialStartUrl,
  waysOf,
} from "./sign-in-model";

/** The sign-in page's state and handlers; the form renders the step it names. */
export function useSignIn(props: Readonly<SignInFormProps>) {
  const { returnTo, organizationId } = props;
  const hints = authorizeHints(returnTo);
  // A fresh sign-in of a named account asks only for its proof: a password or a passkey, as the
  // organisation allows. With neither allowed, the usual way on from the email applies instead.
  const again = hints.fresh && hints.hint !== "" && (props.passwordEnabled || props.passkeyEnabled);
  const [step, setStep] = useState<Step>(again ? "password" : "email");
  const [email, setEmail] = useState(hints.hint);
  const [problem, setProblem] = useState<Problem | null>(() => problemOfRedirect(props.errorCode));
  const [busy, setBusy] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  // Where the address's domain signs in, when it's its company's own sign-in.
  const [company, setCompany] = useState<Company | null>(null);
  // The pending second step: held in memory only, never in the URL or storage.
  const [mfa, setMfa] = useState<Pending | null>(null);
  // The person's name, for the account a fresh sign-in is asked of, when this browser knows it.
  const [name, setName] = useState<string | undefined>();
  // Stops the background passkey ceremony behind the email field; called before any other way.
  const stopAutofill = useRef<() => void>(() => {});

  const ways = waysOf({ ...props, organizationId, returnTo });
  const forgotHref = withReturnTo("/forgot-password", returnTo);

  function continueToApp() {
    goTo(safeReturnTo(returnTo) ?? "/security");
  }

  function toSecondStep(pending: Pending) {
    setMfa(pending);
    setStep("mfa");
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once per page load
  useEffect(() => {
    const challenge = readSocialChallenge(window.location.hash);
    if (!challenge) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    stopAutofill.current();
    toSecondStep({
      token: challenge.mfaToken,
      factors: challenge.factors,
      enrollment: challenge.enrollment,
    });
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
        setProblem(handBackProblem(err));
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

  // A company's answer: signed in, or a second step to meet first.
  function onCompanySession(res: SessionResponse) {
    const challenge = challengeOf(res);
    if (challenge) toSecondStep(pendingOf(challenge, true));
    else continueToApp();
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
        toSecondStep(pendingOf(challenge));
        setBusy(false);
        return;
      }
      await afterPasswordSignIn();
    } catch (err) {
      // An address its company signs in itself: on to that sign-in, when one is found.
      const routed = isSsoRequired(err) && (await toCompany(email));
      if (!routed) setProblem(problemOf(err));
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
      setProblem(passkeyProblem(err));
      setPasskeyBusy(false);
    }
  }

  function onProvider(provider: string) {
    stopAutofill.current();
    goTo(socialStartUrl(provider, organizationId, returnTo));
  }

  function backToEmail() {
    setProblem(null);
    setStep("email");
  }

  const own = ways.ownWay;
  return {
    step,
    email,
    name,
    again,
    problem,
    busy,
    continuing,
    passkeyBusy,
    company,
    mfa,
    ways,
    forgotHref,
    signUpHref: props.selfRegistrationEnabled ? withReturnTo("/sign-up", returnTo) : undefined,
    continueToApp,
    afterPasswordSignIn,
    onContinue,
    onCompanySession,
    onPassword,
    onPasskey,
    onProvider,
    backToEmail,
    // The optional ways on from a step: absent when the organisation doesn't allow them.
    toPassword: props.passwordEnabled ? () => setStep("password") : undefined,
    toLink: ways.linkAllowed ? () => setStep("link") : undefined,
    toOwnWay: own ? () => setStep(own) : undefined,
    passkeyAgain: props.passkeyEnabled ? onPasskey : undefined,
  };
}
