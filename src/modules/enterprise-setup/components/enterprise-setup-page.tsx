"use client";

import { Spinner } from "@qeetrix/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  exchangePortalSession,
  fetchPortalContext,
  getSamlTestSignIn,
  type PortalContext,
  type SamlTestSignIn,
} from "@/modules/enterprise-setup/api/admin-portal";
import { normalizeBranding } from "@/platform/branding/branding";
import { HostedPage } from "@/platform/components/hosted-page";

import { SsoSetup } from "./sso-setup";

type PortalState =
  | { status: "loading" }
  | { status: "ready"; context: PortalContext; test: SamlTestSignIn | null }
  | { status: "error" };

/**
 * Enterprise setup from a one-time link. The link's token is read from the URL fragment only, the
 * fragment cleared at once, and the token exchanged exactly once for the server's HttpOnly
 * portal-session cookie; without one (a reload, or the identity provider sending the browser back
 * from a test sign-in, #saml_test=…), the page resumes on that cookie. The link's token is never
 * stored, logged or kept in state.
 */
export function EnterpriseSetupPage() {
  const { t } = useTranslation("enterpriseSetup");
  const started = useRef(false);
  const [state, setState] = useState<PortalState>({ status: "loading" });

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("token")?.trim();
    const testId = hash.get("saml_test");
    const connectionId = hash.get("saml_connection");
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    }

    void (async () => {
      try {
        const context = token
          ? (await exchangePortalSession(token)).context
          : await fetchPortalContext();
        const test =
          testId && connectionId
            ? await getSamlTestSignIn(connectionId, testId).catch(() => null)
            : null;
        setState({ status: "ready", context, test });
      } catch {
        setState({ status: "error" });
      }
    })();
  }, []);

  if (state.status === "ready") {
    return (
      <SsoSetup
        context={state.context}
        branding={normalizeBranding(state.context.branding)}
        initialTest={state.test}
      />
    );
  }
  const bar = <span className="typography-body-sm text-text-subtle">{t("page.bar")}</span>;
  if (state.status === "error") {
    return (
      <HostedPage
        kind="page"
        status="warning"
        title={t("page.expiredTitle")}
        description={t("page.expiredBody")}
        barEnd={bar}
      />
    );
  }
  return (
    <HostedPage kind="page" title={t("page.opening")} barEnd={bar}>
      <div role="status">
        <Spinner size="md" tone="brand" label={t("page.opening")} />
      </div>
    </HostedPage>
  );
}
