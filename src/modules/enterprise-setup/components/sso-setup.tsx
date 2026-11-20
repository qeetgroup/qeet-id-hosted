"use client";

import { Badge, Card, Text } from "@qeetrix/react";
import { CopyField, type Step, Steps } from "@qeetrix/react/experimental";
import { Fragment, type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  deleteSamlConnection,
  type PortalContext,
  revokeScimToken,
  rotateScimToken,
  type SamlTestSignIn,
  setDomainSSO,
  updateSamlConnection,
} from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import type { Branding } from "@/platform/branding/branding";
import { FormAlert } from "@/platform/components/form-alert";
import { HostedPage } from "@/platform/components/hosted-page";
import { formatDay } from "@/platform/format";
import { ClockIcon } from "@/platform/icons";

import { type IdpKind, idpOf } from "../identity-providers";
import { AddSamlPage } from "./add-saml-page";
import { RemoveConnectionDialog, ScimTokenDialog, TurnOffScimDialog } from "./setup-dialogs";
import {
  ConnectPanel,
  DomainPanel,
  ScimPanel,
  type StepAt,
  TestPanel,
  TurnOnPanel,
} from "./setup-panels";
import { UpcomingRow } from "./setup-rows";
import { type StepId, stepsOf, useSetup } from "./use-setup";
import { VerifyDomainDialog } from "./verify-domain-dialog";

type Overlay =
  | { kind: "domain"; pendingId?: string }
  | { kind: "remove" }
  | { kind: "token"; token: string; first: boolean }
  | { kind: "scimOff" }
  | null;

// The rail's mark for a step: done, a failed test, or nothing yet.
function stepStatus(done: boolean, failed: boolean): { status?: "done" | "failed" } {
  if (done) return { status: "done" };
  return failed ? { status: "failed" } : {};
}

/**
 * Single sign-on for an organisation's outside IT administrator, as a guided setup: verify the
 * domain, connect the identity provider, test it, turn it on, then (optionally) sync people with
 * SCIM. Where you are is always shown, as a step rail beside the work on a laptop and a step bar
 * above it on a tablet or phone. Only the current step is open; finished steps fold to one line with
 * what was done and a way back; steps still to come say what unlocks them. Everything comes from
 * the server, so the same link brings the administrator back to the same place.
 */
export function SsoSetup({
  context,
  branding,
  initialTest,
}: Readonly<{
  context: PortalContext;
  branding?: Branding;
  /** A test sign-in this page was sent back to with, from the identity provider. */
  initialTest: SamlTestSignIn | null;
}>) {
  const { t, i18n } = useTranslation("enterpriseSetup");
  const { setup, failed, reload, setSetup } = useSetup(context);
  const [test, setTest] = useState<SamlTestSignIn | null>(initialTest);
  const [scimSkipped, setScimSkipped] = useState(false);
  // Test again on a finished setup opens the test step once more.
  const [retest, setRetest] = useState(false);
  const [chosen, setChosen] = useState<IdpKind | null>(null);
  const [view, setView] = useState<"setup" | "details">("setup");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const org = context.organization_name ?? "";
  const expires = `${formatDay(context.expires_at, i18n.language)}, ${new Intl.DateTimeFormat(
    i18n.language === "en" ? "en-IN" : i18n.language,
    { hour: "numeric", minute: "2-digit" },
  )
    .format(new Date(context.expires_at))
    .toLowerCase()}`;
  const barEnd = (
    <Text size="sm" tone="subtle" className="text-end">
      <span className="tablet:hidden">{t("page.bar")}</span>
      <span className="hidden tablet:inline">{t("page.barOrg", { org })}</span>
    </Text>
  );

  if (!setup) {
    return (
      <HostedPage
        kind="page"
        width="lg"
        branding={branding}
        title={t("setup.title")}
        barEnd={barEnd}
      >
        {failed && <FormAlert title={t("setup.loadFailed")} />}
      </HostedPage>
    );
  }

  const connection = setup.connection;
  const idp: IdpKind = chosen ?? (connection ? idpOf(connection) : "okta");
  const idpName = t(`connect.idps.${idp}.name`);
  const verified = setup.domains.filter((d) => d.status === "verified");
  const pending = setup.domains.find((d) => d.status !== "verified");
  const domain = verified[0]?.domain;
  const steps = stepsOf(context, setup, { test, scimSkipped });
  const at = steps.findIndex((s) => !s.done);
  const current: StepId | "done" = at === -1 ? "done" : (steps[at]?.id ?? "done");
  const total = steps.length;
  const n = (id: StepId) => steps.findIndex((s) => s.id === id) + 1;
  const done = (id: StepId) => steps.find((s) => s.id === id)?.done ?? false;
  const scimCount = setup.scim?.provisioned_count ?? 0;

  if (view === "details" && connection) {
    return (
      <AddSamlPage
        connection={connection}
        idpName={idpName}
        barEnd={barEnd}
        branding={branding}
        onSaved={(saved) => {
          setSetup({ ...setup, connection: saved });
          setTest(null);
          setView("setup");
        }}
        onCancel={() => setView("setup")}
      />
    );
  }

  async function act(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("setup.loadFailed"));
    } finally {
      setBusy(false);
    }
  }

  // Turning it on makes the connection live and sends the verified domains' people to it.
  const turnOn = () =>
    act(async () => {
      if (!connection) return;
      const live = await updateSamlConnection(connection.id, { status: "active" });
      const domains = await Promise.all(
        setup.domains.map((d) =>
          d.status === "verified" && !d.sso_enabled ? setDomainSSO(d.id, true) : d,
        ),
      );
      setSetup({ ...setup, connection: live, domains });
    });

  const scimOn = () =>
    act(async () => {
      const res = await rotateScimToken();
      setSetup({ ...setup, scim: res.config });
      setOverlay({ kind: "token", token: res.token, first: !setup.scim?.token_set });
    });

  const testFailed = test !== null && test.status !== "succeeded";
  const stepSummary = (id: StepId): string => {
    switch (id) {
      case "domain":
        return domain ?? t("steps.domain.todo");
      case "connect":
        return connection?.idp_entity_id ? `${idpName} · SAML` : t("steps.connect.todo");
      case "test":
        if (done("test")) return t("test.passed");
        return testFailed ? t("test.failed") : t("steps.test.todo");
      case "turnOn":
        return done("turnOn") ? t("turnOn.row", { domain: domain ?? org }) : t("steps.turnOn.todo");
      case "scim":
        return setup.scim?.token_set ? t("scim.row", { count: scimCount }) : t("steps.scim.todo");
    }
  };
  const railSteps: Step[] = steps.map((s) => ({
    label: t(`steps.${s.id}.label`),
    description: stepSummary(s.id),
    ...stepStatus(s.done, s.id === "test" && testFailed),
  }));

  // Each step's panel, open or folded, by where it sits.
  const panels: Record<StepId, (at: StepAt) => ReactElement> = {
    domain: (at) => (
      <DomainPanel
        at={at}
        pending={pending}
        domain={domain}
        onAdd={(pendingId) => setOverlay({ kind: "domain", pendingId })}
      />
    ),
    connect: (at) => (
      <ConnectPanel
        at={at}
        connection={connection}
        idp={idp}
        idpName={idpName}
        orgName={org}
        onIdp={setChosen}
        onDraft={(draft) => setSetup({ ...setup, connection: draft })}
        onDetails={() => setView("details")}
        onRemove={() => setOverlay({ kind: "remove" })}
      />
    ),
    test: (at) => (
      <TestPanel
        at={at}
        open={at.current || retest || (current === "turnOn" && test?.status === "succeeded")}
        connection={connection}
        idp={idp}
        idpName={idpName}
        test={test}
        onTest={setTest}
        onDetails={() => setView("details")}
        onAgain={() => setRetest(true)}
      />
    ),
    turnOn: (at) => (
      <TurnOnPanel
        at={at}
        domain={domain ?? org}
        org={org}
        idpName={idpName}
        busy={busy}
        onTurnOn={() => void turnOn()}
      />
    ),
    scim: (at) => (
      <ScimPanel
        at={at}
        tokenSet={setup.scim?.token_set ?? false}
        count={scimCount}
        idpName={idpName}
        org={org}
        busy={busy}
        onTurnOn={() => void scimOn()}
        onSkip={() => setScimSkipped(true)}
        onTurnOff={() => setOverlay({ kind: "scimOff" })}
      />
    ),
  };
  const panel = (id: StepId): ReactElement => {
    const at: StepAt = { n: n(id), total, title: t(`steps.${id}.label`), current: current === id };
    if (!done(id) && !at.current) {
      return (
        <UpcomingRow key={id} n={at.n} title={at.title} note={t("setup.after", { n: at.n - 1 })} />
      );
    }
    return <Fragment key={id}>{panels[id](at)}</Fragment>;
  };

  const live = connection?.status === "active" && done("turnOn");
  return (
    <HostedPage
      kind="page"
      width="lg"
      branding={branding}
      title={t("setup.title")}
      description={domain ? t("setup.bodyDomain", { org, domain }) : t("setup.body", { org })}
      barEnd={barEnd}
      lead={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge icon={ClockIcon}>{t("setup.expires", { expires })}</Badge>
          <Text size="sm" tone="subtle">
            {t("setup.back")}
          </Text>
        </div>
      }
    >
      <div className="flex flex-col gap-6 laptop:grid laptop:grid-cols-[248px_minmax(0,1fr)] laptop:items-start laptop:gap-12">
        <div className="laptop:sticky laptop:top-8">
          <div className="laptop:hidden">
            <Steps
              steps={railSteps}
              current={Math.min(Math.max(at, 0), total - 1)}
              orientation="horizontal"
            />
          </div>
          <div className="hidden laptop:block">
            <Steps
              steps={railSteps}
              current={Math.min(Math.max(at, 0), total - 1)}
              orientation="vertical"
            />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <FormAlert title={error} />
          {current === "scim" && live && (
            <FormAlert tone="success" title={t("turnOn.liveTitle")}>
              {t("turnOn.liveBody", { domain: domain ?? org, idp: idpName })}
            </FormAlert>
          )}
          {current === "done" && setup.scim?.token_set && (
            <FormAlert tone="success" title={t("scim.doneTitle")}>
              {t("scim.doneBody", { domain: domain ?? org, idp: idpName })}
            </FormAlert>
          )}
          {steps.map((s) => panel(s.id))}
          {current === "done" && setup.scim?.token_set && context.scim_base_url && (
            <Card>
              <CopyField label={t("scim.endpoint")} value={context.scim_base_url} wrap="anywhere" />
            </Card>
          )}
        </div>
      </div>
      {overlay?.kind === "domain" && (
        <VerifyDomainDialog
          pending={
            overlay.pendingId ? setup.domains.find((d) => d.id === overlay.pendingId) : undefined
          }
          onChanged={() => void reload()}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === "remove" && connection && (
        <RemoveConnectionDialog
          name={connection.name}
          idpName={idpName}
          domain={domain}
          onRemove={async () => {
            try {
              await deleteSamlConnection(connection.id);
              setTest(null);
              await reload();
              return true;
            } catch {
              return false;
            }
          }}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === "token" && (
        <ScimTokenDialog
          token={overlay.token}
          endpoint={context.scim_base_url}
          first={overlay.first}
          idpName={idpName}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === "scimOff" && (
        <TurnOffScimDialog
          idpName={idpName}
          orgName={org}
          onTurnOff={async () => {
            try {
              await revokeScimToken();
              setScimSkipped(true);
              await reload();
              return true;
            } catch {
              return false;
            }
          }}
          onClose={() => setOverlay(null)}
        />
      )}
    </HostedPage>
  );
}
