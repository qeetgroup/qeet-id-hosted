"use client";

import { Button } from "@qeetrix/react";
import { useTranslation } from "react-i18next";

import type {
  PortalDomain,
  SamlConnection,
  SamlTestSignIn,
} from "@/modules/enterprise-setup/api/admin-portal";
import { PlusIcon } from "@/platform/icons";

import type { IdpKind } from "../identity-providers";
import { ConnectStep } from "./connect-step";
import { CurrentStep, DoneRow } from "./setup-rows";
import { TestStep } from "./test-step";

/** Where a step sits in the setup, and whether it is the one open now. */
export type StepAt = { n: number; total: number; title: string; current: boolean };

/** Verify the domain: open, the pending record and Add a domain; done, the verified domain. */
export function DomainPanel({
  at,
  pending,
  domain,
  onAdd,
}: Readonly<{
  at: StepAt;
  pending?: PortalDomain;
  domain?: string;
  /** Opens the domain dialog, on a pending domain's record when one is named. */
  onAdd: (pendingId?: string) => void;
}>) {
  const { t } = useTranslation("enterpriseSetup");
  if (!at.current) {
    return (
      <DoneRow
        title={at.title}
        summary={t("domain.verified", { domain })}
        actions={
          <Button variant="ghost" size="sm" onClick={() => onAdd()}>
            {t("domain.add")}
          </Button>
        }
      />
    );
  }
  return (
    <CurrentStep n={at.n} total={at.total} title={at.title} body={t("domain.body")}>
      {pending && (
        <DoneRow
          title={pending.domain}
          summary={t("domain.pending", { domain: pending.domain })}
          actions={
            <Button variant="ghost" size="sm" onClick={() => onAdd(pending.id)}>
              {t("domain.verifyNow")}
            </Button>
          }
        />
      )}
      <Button icon={PlusIcon} className="self-start" onClick={() => onAdd()}>
        {t("domain.add")}
      </Button>
    </CurrentStep>
  );
}

/** Connect the identity provider: open, the choice and the draft; done, how it is connected. */
export function ConnectPanel({
  at,
  connection,
  idp,
  idpName,
  orgName,
  onIdp,
  onDraft,
  onDetails,
  onRemove,
}: Readonly<{
  at: StepAt;
  connection: SamlConnection | null;
  idp: IdpKind;
  idpName: string;
  orgName: string;
  onIdp: (idp: IdpKind) => void;
  onDraft: (connection: SamlConnection) => void;
  onDetails: () => void;
  onRemove: () => void;
}>) {
  const { t } = useTranslation("enterpriseSetup");
  if (at.current) {
    return (
      <CurrentStep n={at.n} total={at.total} title={at.title}>
        <ConnectStep
          connection={connection}
          idp={idp}
          orgName={orgName}
          onIdp={onIdp}
          onDraft={onDraft}
          onAddDetails={onDetails}
        />
      </CurrentStep>
    );
  }
  const live = connection?.status === "active";
  return (
    <DoneRow
      title={at.title}
      summary={
        live ? t("connect.connectedOn", { idp: idpName }) : t("connect.connected", { idp: idpName })
      }
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={onDetails}>
            {t("connect.view")}
          </Button>
          {live && (
            <Button variant="ghost" tone="danger" size="sm" onClick={onRemove}>
              {t("connect.remove")}
            </Button>
          )}
        </>
      }
    />
  );
}

/** Test it: open while it is current or asked for again; done, what the provider sent. */
export function TestPanel({
  at,
  open,
  connection,
  idp,
  idpName,
  test,
  onTest,
  onDetails,
  onAgain,
}: Readonly<{
  at: StepAt;
  /** Shown open: the current step, a test asked for again, or a passed one just before Turn on. */
  open: boolean;
  connection: SamlConnection | null;
  idp: IdpKind;
  idpName: string;
  test: SamlTestSignIn | null;
  onTest: (test: SamlTestSignIn) => void;
  onDetails: () => void;
  onAgain: () => void;
}>) {
  const { t } = useTranslation("enterpriseSetup");
  if (connection && open) {
    return (
      <CurrentStep
        n={at.n}
        total={at.total}
        title={at.title}
        finished={test?.status === "succeeded"}
      >
        <TestStep
          connection={connection}
          idp={idp}
          idpName={idpName}
          test={test}
          onTest={onTest}
          onUpdate={onDetails}
        />
      </CurrentStep>
    );
  }
  return (
    <DoneRow
      title={at.title}
      summary={
        test?.email ? t("test.passedRow", { idp: idpName, email: test.email }) : t("test.passed")
      }
      actions={
        <Button variant="ghost" size="sm" onClick={onAgain}>
          {t("test.again")}
        </Button>
      }
    />
  );
}

/** Turn it on: the connection goes live and the verified domains' people sign in through it. */
export function TurnOnPanel({
  at,
  domain,
  org,
  idpName,
  busy,
  onTurnOn,
  onTurnOff,
}: Readonly<{
  at: StepAt;
  /** The verified domain, else the organisation's name. */
  domain: string;
  org: string;
  idpName: string;
  busy: boolean;
  onTurnOn: () => void;
  /** Stops sending the domain's people to the identity provider; asks first. */
  onTurnOff: () => void;
}>) {
  const { t } = useTranslation("enterpriseSetup");
  if (!at.current) {
    return (
      <DoneRow
        title={at.title}
        summary={t("turnOn.row", { domain })}
        actions={
          <Button variant="ghost" tone="danger" size="sm" disabled={busy} onClick={onTurnOff}>
            {t("turnOn.turnOff")}
          </Button>
        }
      />
    );
  }
  return (
    <CurrentStep
      n={at.n}
      total={at.total}
      title={at.title}
      body={t("turnOn.body", { domain, org, idp: idpName })}
    >
      <Button className="self-start" loading={busy} onClick={onTurnOn}>
        {t("turnOn.button")}
      </Button>
    </CurrentStep>
  );
}

/** Sync people with SCIM: open, turn it on or not now; done, its state and a new token or off. */
export function ScimPanel({
  at,
  tokenSet,
  count,
  idpName,
  org,
  busy,
  onTurnOn,
  onSkip,
  onTurnOff,
}: Readonly<{
  at: StepAt;
  tokenSet: boolean;
  /** People provisioned so far. */
  count: number;
  idpName: string;
  org: string;
  busy: boolean;
  /** Issues a token: the first, or a new one in place of the old. */
  onTurnOn: () => void;
  onSkip: () => void;
  onTurnOff: () => void;
}>) {
  const { t } = useTranslation("enterpriseSetup");
  if (at.current) {
    return (
      <CurrentStep
        n={at.n}
        total={at.total}
        title={at.title}
        body={t("scim.body", { idp: idpName, org })}
      >
        <div className="flex flex-wrap gap-3">
          <Button loading={busy} onClick={onTurnOn}>
            {t("scim.turnOn")}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onSkip}>
            {t("scim.notNow")}
          </Button>
        </div>
      </CurrentStep>
    );
  }
  if (!tokenSet) {
    return (
      <DoneRow
        title={at.title}
        summary={t("scim.skipped")}
        actions={
          <Button variant="ghost" size="sm" disabled={busy} onClick={onTurnOn}>
            {t("scim.turnOn")}
          </Button>
        }
      />
    );
  }
  return (
    <DoneRow
      title={at.title}
      summary={t("scim.row", { count })}
      actions={
        <>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onTurnOn}>
            {t("scim.newToken")}
          </Button>
          <Button variant="ghost" tone="danger" size="sm" onClick={onTurnOff}>
            {t("scim.turnOff")}
          </Button>
        </>
      }
    />
  );
}
