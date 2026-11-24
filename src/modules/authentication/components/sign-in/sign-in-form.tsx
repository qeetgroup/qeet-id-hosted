"use client";

import { useTranslation } from "react-i18next";

import type { Organisation } from "@/platform/api/organisation";
import type { Branding } from "@/platform/branding/branding";
import { AppLine } from "@/platform/components/app-line";
import { HostedPage } from "@/platform/components/hosted-page";
import { returnsToDevice } from "@/platform/navigation/return-to";

import { CompanyStep } from "./company-step";
import { EmailStep } from "./email-step";
import { LinkStep } from "./link-step";
import { PasskeyOffer } from "./passkey-offer";
import { FinishingPage, NoWayPage, PasswordPage, SecondStep } from "./sign-in-pages";
import { useSignIn } from "./use-sign-in";

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

/**
 * Sign in, as the mockups draw it: the email first, then the company's own sign-in when the
 * address's domain uses one, else the way the organisation allows (a password, a sign-in link);
 * or a passkey or social account straight away. Then the second step when the account has one,
 * and once, after a password, the offer of a passkey. Without an application to return to, it
 * goes on to the passkeys page.
 */
export function SignInForm(props: Readonly<SignInFormProps>) {
  const { returnTo, organizationId, branding } = props;
  const org = props.organisation ?? {};
  const flow = useSignIn(props);
  const { email } = flow;

  switch (flow.step) {
    case "finishing":
      return <FinishingPage branding={branding} />;
    case "offer":
      return <PasskeyOffer email={email} branding={branding} onContinue={flow.continueToApp} />;
    case "link":
      return (
        <LinkStep
          email={email}
          organizationId={organizationId}
          returnTo={returnTo}
          linkMinutes={org.linkMinutes}
          branding={branding}
          onChangeEmail={flow.backToEmail}
          onUsePassword={flow.toPassword}
          onBack={flow.backToEmail}
        />
      );
    case "password":
      return (
        <PasswordPage
          again={flow.again}
          email={email}
          name={flow.name}
          clientName={props.clientName}
          org={org.name}
          forgotHref={flow.forgotHref}
          problem={flow.problem}
          busy={flow.busy}
          branding={branding}
          onChangeEmail={flow.backToEmail}
          onSubmit={flow.onPassword}
          onLink={flow.toLink}
          onPasskey={flow.passkeyAgain}
          passwordAllowed={props.passwordEnabled}
        />
      );
    case "company":
      if (!flow.company) break;
      return (
        <CompanyStep
          email={email}
          company={flow.company}
          returnTo={returnTo}
          branding={branding}
          onOther={flow.toOwnWay}
          onChangeEmail={flow.backToEmail}
          onSession={flow.onCompanySession}
        />
      );
    case "mfa":
      if (!flow.mfa) break;
      return (
        <SecondStep
          pending={flow.mfa}
          email={email}
          organisation={org}
          rememberDeviceEnabled={props.rememberDeviceEnabled}
          branding={branding}
          onDone={flow.mfa.company ? flow.continueToApp : flow.afterPasswordSignIn}
        />
      );
  }
  return <EmailEntry {...props} flow={flow} />;
}

/** The first step: the email, a passkey or a social account; or why there's no way in. */
function EmailEntry({
  flow,
  ...props
}: Readonly<SignInFormProps & { flow: ReturnType<typeof useSignIn> }>) {
  const { t } = useTranslation("signIn");
  const org = props.organisation ?? {};
  const appLine = props.clientName ? (
    <AppLine name={props.clientName} logoUri={props.clientLogoUri} />
  ) : undefined;
  if (!flow.ways.emailEnabled && !props.passkeyEnabled && flow.ways.providers.length === 0) {
    return (
      <NoWayPage
        clientName={props.clientName}
        orgName={org.name}
        appLine={appLine}
        branding={props.branding}
      />
    );
  }
  return (
    <HostedPage
      branding={props.branding}
      title={t("title")}
      description={!appLine && returnsToDevice(props.returnTo) ? t("device") : undefined}
      lead={appLine}
    >
      <EmailStep
        email={flow.email}
        emailEnabled={flow.ways.emailEnabled}
        passkeyEnabled={props.passkeyEnabled}
        providers={flow.ways.providers}
        signUpHref={flow.signUpHref}
        forgotHref={flow.forgotHref}
        org={org.name}
        problem={flow.problem}
        passkeyBusy={flow.passkeyBusy}
        continuing={flow.continuing}
        onContinue={flow.onContinue}
        onPasskey={flow.onPasskey}
        onProvider={flow.onProvider}
      />
    </HostedPage>
  );
}
