"use client";

import { Badge, Button, Spinner, Text } from "@qeetrix/react";
import {
  CheckItem,
  CheckList,
  DescriptionItem,
  DescriptionList,
  InstructionList,
  InstructionStep,
} from "@qeetrix/react/experimental";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  beginSamlTestSignIn,
  getSamlTestSignIn,
  type SamlConnection,
  type SamlTestResult,
  type SamlTestSignIn,
  testSamlConnection,
} from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";
import {
  CircleCheckIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from "@/platform/icons";

import type { IdpKind } from "../identity-providers";

const POLL_MS = 2000;

/**
 * Test the connection, in two parts, both from the server: its checks (entity ID, sign-in address,
 * certificate and its dates, email attribute), then a real sign-in through the identity provider
 * in a new tab, which shows exactly what the provider sent: the email (and whether its domain is
 * verified), the name, the NameID and the attributes. A failed test says why and how to fix it.
 */
export function TestStep({
  connection,
  idp,
  idpName,
  test,
  onTest,
  onUpdate,
}: {
  connection: SamlConnection;
  idp: IdpKind;
  idpName: string;
  /** The latest test sign-in's result, kept by the page for the steps after this one. */
  test: SamlTestSignIn | null;
  onTest: (test: SamlTestSignIn) => void;
  onUpdate: () => void;
}) {
  const { t } = useTranslation("enterpriseSetup");
  const [checks, setChecks] = useState<SamlTestResult | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    void testSamlConnection(connection.id)
      .then((r) => live.current && setChecks(r))
      .catch(() => {});
    return () => {
      live.current = false;
    };
  }, [connection.id]);

  // The identity provider opens in a new tab, opened now so the browser doesn't block it; this tab
  // asks the server for the result until the provider has answered.
  async function signIn() {
    setError(null);
    const tab = window.open("", "_blank");
    if (!tab) {
      setError(t("test.popupBlocked"));
      return;
    }
    // The provider's page gets no handle on this one (reverse tabnabbing).
    tab.opener = null;
    setWaiting(true);
    try {
      const begun = await beginSamlTestSignIn(connection.id);
      if (!begun.redirect_url) throw new Error("no address");
      tab.location.href = begun.redirect_url;
      while (live.current) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const now = await getSamlTestSignIn(connection.id, begun.id);
        if (now.status !== "pending") {
          if (live.current) onTest(now);
          break;
        }
      }
    } catch (err) {
      tab.close();
      setError(err instanceof ApiError ? err.message : t("setup.loadFailed"));
    } finally {
      if (live.current) setWaiting(false);
    }
  }

  const signInButton = (
    <Button
      type="button"
      icon={ExternalLinkIcon}
      className="self-start"
      loading={waiting}
      onClick={() => void signIn()}
    >
      {waiting ? t("test.waiting", { idp: idpName }) : t("test.signIn")}
    </Button>
  );

  if (test?.status === "succeeded") {
    const attributes = (test.attributes ?? []).map((a) => a.friendly_name || a.name).join(", ");
    return (
      <>
        <FormAlert tone="success" title={t("test.passedTitle", { idp: idpName })}>
          {t("test.passedBody")}
        </FormAlert>
        <DescriptionList>
          <DescriptionItem term={t("test.email")}>
            <span className="inline-flex flex-wrap items-center gap-2">
              {test.email}
              <Badge
                tone={test.email_domain_verified ? "success" : "warning"}
                icon={test.email_domain_verified ? CircleCheckIcon : TriangleAlertIcon}
              >
                {test.email_domain_verified ? t("test.domainOk") : t("test.domainNotVerified")}
              </Badge>
            </span>
          </DescriptionItem>
          {test.name && <DescriptionItem term={t("test.name")}>{test.name}</DescriptionItem>}
          {test.name_id && (
            <DescriptionItem term={t("test.nameId")} description={test.name_id_format}>
              {test.name_id}
            </DescriptionItem>
          )}
          {attributes && (
            <DescriptionItem term={t("test.attributes")}>{attributes}</DescriptionItem>
          )}
        </DescriptionList>
        <Button
          type="button"
          variant="ghost"
          icon={RefreshCwIcon}
          className="self-start"
          loading={waiting}
          onClick={() => void signIn()}
        >
          {t("test.again")}
        </Button>
      </>
    );
  }

  if (test) {
    return (
      <>
        <FormAlert title={error} />
        <FormAlert title={t("test.failedTitle", { idp: idpName })}>
          {test.status === "expired" ? t("test.expired") : test.error_message}
        </FormAlert>
        <InstructionList>
          <InstructionStep title={t(`connect.idps.${idp}.fix1`)}>
            {t("test.fix1Body", { idp: idpName })}
          </InstructionStep>
          <InstructionStep title={t("test.fix2")}>{t("test.fix2Body")}</InstructionStep>
          <InstructionStep title={t("test.fix3")} />
        </InstructionList>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="soft" onClick={onUpdate}>
            {t("test.update")}
          </Button>
          <Button
            type="button"
            icon={ExternalLinkIcon}
            loading={waiting}
            onClick={() => void signIn()}
          >
            {waiting ? t("test.waiting", { idp: idpName }) : t("test.again")}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <FormAlert title={error} />
      <Text size="md" weight="medium" render={<p />}>
        {t("test.checks")}
      </Text>
      {checks ? (
        <CheckList>
          {checks.checks.map((c) => (
            <CheckItem
              key={c.name}
              title={c.name}
              detail={c.detail}
              status={c.ok ? "passed" : "failed"}
            />
          ))}
        </CheckList>
      ) : (
        <Spinner size="md" tone="brand" label={t("test.checks")} />
      )}
      <Text size="md" render={<p />}>
        {t("test.body", { idp: idpName })}
      </Text>
      {signInButton}
    </>
  );
}
