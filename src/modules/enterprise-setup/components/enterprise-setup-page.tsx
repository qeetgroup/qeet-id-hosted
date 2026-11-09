"use client";

import { Spinner } from "@qeetrix/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  exchangePortalSession,
  fetchPortalContext,
  type PortalContext,
} from "@/modules/enterprise-setup/api/admin-portal";
import { normalizeBranding } from "@/platform/branding/branding";
import { HostedPage } from "@/platform/components/hosted-page";

import { EnterpriseSetupView } from "./enterprise-setup-view";

type PortalState =
  | { status: "loading" }
  | { status: "ready"; context: PortalContext }
  | { status: "error" };

/**
 * Enterprise setup from a one-time link: the token is read from the URL fragment only, the fragment
 * cleared at once, and the token exchanged exactly once for the server's HttpOnly portal-session
 * cookie. Without a token (a reload), the page resumes on that cookie.
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
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    }

    void (
      token ? exchangePortalSession(token).then((result) => result.context) : fetchPortalContext()
    )
      .then((context) => setState({ status: "ready", context }))
      .catch(() => setState({ status: "error" }));
  }, []);

  if (state.status === "ready") {
    return (
      <EnterpriseSetupView
        context={state.context}
        branding={normalizeBranding(state.context.branding)}
      />
    );
  }
  if (state.status === "error") {
    return (
      <HostedPage
        single
        status="warning"
        title={t("page.unavailable")}
        description={t("page.unavailableBody")}
      />
    );
  }
  return (
    <HostedPage single title={t("page.opening")} description={t("page.verifying")}>
      <div role="status" className="flex items-center gap-3 py-2">
        <Spinner size="md" tone="brand" label={t("page.opening")} />
      </div>
    </HostedPage>
  );
}
