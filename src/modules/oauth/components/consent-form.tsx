"use client";

import { Button, Text } from "@qeetrix/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Account } from "@/platform/api/account";
import { ApiError, apiPost } from "@/platform/api/client";
import { ADDRESS_NOT_ALLOWED } from "@/platform/api/errors";
import type { Branding } from "@/platform/branding/branding";
import { AccountChip } from "@/platform/components/account-chip";
import { AppTile } from "@/platform/components/app-line";
import { FormAlert } from "@/platform/components/form-alert";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { goTo } from "@/platform/navigation/go-to";

import { ScopeList } from "./scope-list";

/** Why a request ended: it can't be decided again from this page. */
export type Ended = "ended" | "unregistered" | "recorded" | "network";

/** The end an API refusal means for this request; null for one that keeps the buttons. */
export function endedBy(code: string): Ended | null {
  switch (code) {
    case "oidc.consent_request_invalid":
    case "unauthorized":
      return "ended";
    case "oidc.redirect_uri_not_registered":
      return "unregistered";
    case ADDRESS_NOT_ALLOWED:
      return "network";
  }
  return null;
}

// An absolute http(s) address, the only kind of redirect the API answers with.
function isWebAddress(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function hostOf(uri?: string): string | undefined {
  if (!uri) return undefined;
  try {
    const u = new URL(uri);
    return u.protocol === "https:" ? u.hostname.replace(/^www\./, "") : undefined;
  } catch {
    return undefined;
  }
}

/** A request that has ended, said in full: why, and that the window can be closed. */
export function EndedPage({
  ended,
  clientName,
  branding,
}: {
  ended: Ended;
  clientName: string;
  branding?: Branding;
}) {
  const { t } = useTranslation("consent");
  const status = ended === "recorded" ? "success" : ended === "unregistered" ? "danger" : "warning";
  return (
    <HostedPage
      single
      status={status}
      branding={branding}
      title={t(`${ended}Title`, { client: clientName || t("common:fallbacks.application") })}
      description={t(`${ended}Body`)}
    />
  );
}

/**
 * When an application asks for access to the account: who it is (its site under its name, so a
 * look-alike can be spotted), which account is signed in, what it could do, and Deny or Allow,
 * side by side on every screen. Only the recorded request's id goes with the answer: the server
 * takes everything else, and where the browser goes next, from its own record.
 */
export function ConsentForm({
  requestId,
  scopes,
  clientName,
  clientLogoUri,
  clientUri,
  account,
  branding,
}: {
  requestId: string;
  scopes: string[];
  clientName: string;
  clientLogoUri?: string;
  clientUri?: string;
  account: Account | null;
  branding?: Branding;
}) {
  const { t } = useTranslation("consent");
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState<Ended | null>(null);
  const [busy, setBusy] = useState<"allow" | "deny" | null>(null);
  const appName = clientName || t("common:fallbacks.application");
  const host = hostOf(clientUri);

  async function decide(approve: boolean) {
    setError(null);
    setBusy(approve ? "allow" : "deny");
    try {
      const res = await apiPost<{ redirect?: string }>("/v1/oauth/authorize/decision", {
        request_id: requestId,
        approve,
      });
      if (res?.redirect && isWebAddress(res.redirect)) {
        goTo(res.redirect);
        return;
      }
      setEnded("recorded");
    } catch (err) {
      const end = endedBy(err instanceof ApiError ? err.code : "");
      if (end) setEnded(end);
      else setError(err instanceof ApiError ? err.message : t("signIn:problems.generic.title"));
    }
    setBusy(null);
  }

  if (ended) return <EndedPage ended={ended} clientName={clientName} branding={branding} />;

  return (
    <HostedPage
      branding={branding}
      title={t("title", { client: appName })}
      lead={
        <div className="flex items-center gap-3">
          <AppTile name={appName} logoUri={clientLogoUri} size={40} />
          <div className="min-w-0">
            <Text size="md" weight="semibold" render={<p />}>
              {appName}
            </Text>
            {host && (
              <Text size="sm" tone="subtle" render={<p />}>
                {host}
              </Text>
            )}
          </div>
        </div>
      }
    >
      <FormStack>
        <FormAlert title={error} />
        {account && <AccountChip email={account.email} name={account.name} />}
        <div>
          <Text size="md" weight="medium" render={<p />}>
            {t("body")}
          </Text>
          <ScopeList className="mt-3" scopes={scopes} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="soft"
            size="lg"
            fullWidth
            loading={busy === "deny"}
            disabled={busy !== null}
            onClick={() => void decide(false)}
          >
            {t("deny")}
          </Button>
          <Button
            type="button"
            size="lg"
            fullWidth
            loading={busy === "allow"}
            disabled={busy !== null}
            onClick={() => void decide(true)}
          >
            {t("allow")}
          </Button>
        </div>
      </FormStack>
    </HostedPage>
  );
}
