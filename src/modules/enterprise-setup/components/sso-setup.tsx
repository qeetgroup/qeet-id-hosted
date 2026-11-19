"use client";

import { Badge, Button, Card, Text } from "@qeetrix/react";
import { CopyField, type Step, Steps } from "@qeetrix/react/experimental";
import { type ReactNode, useState } from "react";
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
import { ClockIcon, PlusIcon } from "@/platform/icons";

import { type IdpKind, idpOf } from "../identity-providers";
import { AddSamlPage } from "./add-saml-page";
import { ConnectStep } from "./connect-step";
import { RemoveConnectionDialog, ScimTokenDialog, TurnOffScimDialog } from "./setup-dialogs";
import { CurrentStep, DoneRow, UpcomingRow } from "./setup-rows";
import { TestStep } from "./test-step";
import { type StepId, stepsOf, useSetup } from "./use-setup";
import { VerifyDomainDialog } from "./verify-domain-dialog";

type Overlay =
  | { kind: "domain"; pendingId?: string }
  | { kind: "remove" }
  | { kind: "token"; token: string; first: boolean }
  | { kind: "scimOff" }
  | null;

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
}: {
  context: PortalContext;
  branding?: Branding;
  /** A test sign-in this page was sent back to with, from the identity provider. */
  initialTest: SamlTestSignIn | null;
}) {
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

  const stepSummary = (id: StepId): string => {
    switch (id) {
      case "domain":
        return domain ?? t("steps.domain.todo");
      case "connect":
        return connection?.idp_entity_id ? `${idpName} · SAML` : t("steps.connect.todo");
      case "test":
        return done("test")
          ? t("test.passed")
          : test && test.status !== "succeeded"
            ? t("test.failed")
            : t("steps.test.todo");
      case "turnOn":
        return done("turnOn") ? t("turnOn.row", { domain: domain ?? org }) : t("steps.turnOn.todo");
      case "scim":
        return setup.scim?.token_set ? t("scim.row", { count: scimCount }) : t("steps.scim.todo");
    }
  };
  const railSteps: Step[] = steps.map((s) => ({
    label: t(`steps.${s.id}.label`),
    description: stepSummary(s.id),
    ...(s.done
      ? { status: "done" as const }
      : s.id === "test" && test && test.status !== "succeeded"
        ? { status: "failed" as const }
        : {}),
  }));

  const panel = (id: StepId): ReactNode => {
    const title = t(`steps.${id}.label`);
    const isCurrent = current === id;
    if (!done(id) && !isCurrent) {
      return (
        <UpcomingRow key={id} n={n(id)} title={title} note={t("setup.after", { n: n(id) - 1 })} />
      );
    }
    switch (id) {
      case "domain":
        return isCurrent ? (
          <CurrentStep key={id} n={n(id)} total={total} title={title} body={t("domain.body")}>
            {pending && (
              <DoneRow
                title={pending.domain}
                summary={t("domain.pending", { domain: pending.domain })}
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOverlay({ kind: "domain", pendingId: pending.id })}
                  >
                    {t("domain.verifyNow")}
                  </Button>
                }
              />
            )}
            <Button
              icon={PlusIcon}
              className="self-start"
              onClick={() => setOverlay({ kind: "domain" })}
            >
              {t("domain.add")}
            </Button>
          </CurrentStep>
        ) : (
          <DoneRow
            key={id}
            title={title}
            summary={t("domain.verified", { domain })}
            actions={
              <Button variant="ghost" size="sm" onClick={() => setOverlay({ kind: "domain" })}>
                {t("domain.add")}
              </Button>
            }
          />
        );
      case "connect":
        return isCurrent ? (
          <CurrentStep key={id} n={n(id)} total={total} title={title}>
            <ConnectStep
              connection={connection}
              idp={idp}
              orgName={org}
              onIdp={setChosen}
              onDraft={(draft) => setSetup({ ...setup, connection: draft })}
              onAddDetails={() => setView("details")}
            />
          </CurrentStep>
        ) : (
          <DoneRow
            key={id}
            title={title}
            summary={
              connection?.status === "active"
                ? t("connect.connectedOn", { idp: idpName })
                : t("connect.connected", { idp: idpName })
            }
            actions={
              <>
                <Button variant="ghost" size="sm" onClick={() => setView("details")}>
                  {t("connect.view")}
                </Button>
                {connection?.status === "active" && (
                  <Button
                    variant="ghost"
                    tone="danger"
                    size="sm"
                    onClick={() => setOverlay({ kind: "remove" })}
                  >
                    {t("connect.remove")}
                  </Button>
                )}
              </>
            }
          />
        );
      case "test":
        if (
          connection &&
          (isCurrent || retest || (current === "turnOn" && test?.status === "succeeded"))
        ) {
          return (
            <CurrentStep
              key={id}
              n={n(id)}
              total={total}
              title={title}
              finished={test?.status === "succeeded"}
            >
              <TestStep
                connection={connection}
                idp={idp}
                idpName={idpName}
                test={test}
                onTest={setTest}
                onUpdate={() => setView("details")}
              />
            </CurrentStep>
          );
        }
        return (
          <DoneRow
            key={id}
            title={title}
            summary={
              test?.email
                ? t("test.passedRow", { idp: idpName, email: test.email })
                : t("test.passed")
            }
            actions={
              <Button variant="ghost" size="sm" onClick={() => setRetest(true)}>
                {t("test.again")}
              </Button>
            }
          />
        );
      case "turnOn":
        return isCurrent ? (
          <CurrentStep
            key={id}
            n={n(id)}
            total={total}
            title={title}
            body={t("turnOn.body", { domain: domain ?? org, org, idp: idpName })}
          >
            <Button className="self-start" loading={busy} onClick={() => void turnOn()}>
              {t("turnOn.button")}
            </Button>
          </CurrentStep>
        ) : (
          <DoneRow key={id} title={title} summary={t("turnOn.row", { domain: domain ?? org })} />
        );
      case "scim":
        return isCurrent ? (
          <CurrentStep
            key={id}
            n={n(id)}
            total={total}
            title={title}
            body={t("scim.body", { idp: idpName, org })}
          >
            <div className="flex flex-wrap gap-3">
              <Button loading={busy} onClick={() => void scimOn()}>
                {t("scim.turnOn")}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setScimSkipped(true)}>
                {t("scim.notNow")}
              </Button>
            </div>
          </CurrentStep>
        ) : (
          <DoneRow
            key={id}
            title={title}
            summary={
              setup.scim?.token_set ? t("scim.row", { count: scimCount }) : t("scim.skipped")
            }
            actions={
              setup.scim?.token_set ? (
                <>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => void scimOn()}>
                    {t("scim.newToken")}
                  </Button>
                  <Button
                    variant="ghost"
                    tone="danger"
                    size="sm"
                    onClick={() => setOverlay({ kind: "scimOff" })}
                  >
                    {t("scim.turnOff")}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void scimOn()}>
                  {t("scim.turnOn")}
                </Button>
              )
            }
          />
        );
    }
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
