"use client";

import { Spinner, Text } from "@qeetrix/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { MfaChallenge } from "@/modules/authentication/components/mfa/mfa-challenge";
import { MfaEnrollment } from "@/modules/authentication/components/mfa/mfa-enrollment";
import type { Organisation } from "@/platform/api/organisation";
import type { Branding } from "@/platform/branding/branding";
import { AccountChip } from "@/platform/components/account-chip";
import { FormAlert } from "@/platform/components/form-alert";
import { HostedPage } from "@/platform/components/hosted-page";

import type { Problem } from "../../sign-in-problems";
import { PasswordStep } from "./password-step";
import type { Pending } from "./sign-in-model";

/** While a company's hand-back is traded for the session. */
export function FinishingPage({ branding }: Readonly<{ branding?: Branding }>) {
  const { t } = useTranslation("signIn");
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

/** When the organisation leaves no way to sign in to the application. */
export function NoWayPage({
  clientName,
  orgName,
  appLine,
  branding,
}: Readonly<{ clientName: string; orgName?: string; appLine?: ReactNode; branding?: Branding }>) {
  const { t } = useTranslation("signIn");
  let body = t("none.bodyNoClient");
  if (clientName && orgName) body = t("none.bodyOrg", { client: clientName, org: orgName });
  else if (clientName) body = t("none.body", { client: clientName });
  return (
    <HostedPage single branding={branding} title={t("title")} lead={appLine}>
      <FormAlert tone="info" title={t("none.title")}>
        {body}
      </FormAlert>
    </HostedPage>
  );
}

/**
 * The password, after the email; or, when the application asked for a fresh sign-in of a named
 * account (again), only the proof for that account, by password or passkey.
 */
export function PasswordPage({
  again,
  email,
  name,
  clientName,
  org,
  forgotHref,
  problem,
  busy,
  branding,
  onChangeEmail,
  onSubmit,
  onLink,
  onPasskey,
  passwordAllowed = true,
}: Readonly<{
  again: boolean;
  email: string;
  /** The person's name for the account a fresh sign-in is asked of, when this browser knows it. */
  name?: string;
  clientName: string;
  org?: string;
  forgotHref: string;
  problem: Problem | null;
  busy: boolean;
  branding?: Branding;
  onChangeEmail: () => void;
  onSubmit: (password: string) => void;
  onLink?: () => void;
  onPasskey?: () => void;
  /** False when the organisation turned passwords off. */
  passwordAllowed?: boolean;
}>) {
  const { t } = useTranslation("signIn");
  if (again) {
    return (
      <HostedPage
        branding={branding}
        title={t("again.title")}
        description={clientName ? t("again.body", { client: clientName }) : t("again.bodyNoClient")}
        lead={<AccountChip email={email} name={name} />}
      >
        <PasswordStep
          email={email}
          org={org}
          problem={problem}
          busy={busy}
          onSubmit={onSubmit}
          onPasskey={onPasskey}
          passwordAllowed={passwordAllowed}
        />
      </HostedPage>
    );
  }
  return (
    <HostedPage
      branding={branding}
      title={t("password.title")}
      lead={<AccountChip email={email} action={t("password.change")} onAction={onChangeEmail} />}
    >
      <PasswordStep
        email={email}
        forgotHref={forgotHref}
        org={org}
        problem={problem}
        busy={busy}
        onSubmit={onSubmit}
        onLink={onLink}
      />
    </HostedPage>
  );
}

/** The second step: set one up when the organisation requires it, else meet it. */
export function SecondStep({
  pending,
  email,
  organisation,
  rememberDeviceEnabled,
  branding,
  onDone,
}: Readonly<{
  pending: Pending;
  email: string;
  organisation: Organisation;
  rememberDeviceEnabled: boolean;
  branding?: Branding;
  onDone: () => void | Promise<void>;
}>) {
  if (pending.enrollment) {
    return (
      <MfaEnrollment
        mfaToken={pending.token}
        dueAt={pending.enrollment.dueAt}
        email={email || undefined}
        orgName={organisation.name}
        branding={branding}
        onDone={onDone}
      />
    );
  }
  return (
    <MfaChallenge
      mfaToken={pending.token}
      factors={pending.factors}
      email={email || undefined}
      rememberDeviceEnabled={rememberDeviceEnabled}
      rememberDays={organisation.rememberDays}
      branding={branding}
      onVerified={onDone}
    />
  );
}
