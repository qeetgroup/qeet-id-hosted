"use client";

import { Spinner } from "@qeetrix/ui";
import { useEffect, useRef, useState } from "react";
import {
  exchangePortalSession,
  fetchPortalContext,
  type PortalContext,
} from "@/modules/enterprise-setup/api/admin-portal";
import { normalizeBranding } from "@/platform/branding/branding";
import { AuthCard } from "@/platform/components/auth-card";
import { AuthShell } from "@/platform/components/auth-shell";

import { EnterpriseSetupView } from "./enterprise-setup-view";

type PortalState =
  | { status: "loading" }
  | { status: "ready"; context: PortalContext }
  | { status: "error" };

export function EnterpriseSetupPage() {
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

  const branding = normalizeBranding(state.status === "ready" ? state.context.branding : undefined);

  return (
    <AuthShell branding={branding} className="lg:grid-cols-[0.85fr_1.15fr]">
      {state.status === "loading" && (
        <AuthCard title="Opening enterprise setup" subtitle="Verifying this secure link…">
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        </AuthCard>
      )}
      {state.status === "error" && (
        <AuthCard
          title="This link isn't available"
          subtitle="It may have expired, been revoked, already been used, or the URL is incomplete."
        >
          <p className="text-sm text-muted-foreground">
            Ask whoever sent you this link to generate a new one.
          </p>
        </AuthCard>
      )}
      {state.status === "ready" && <EnterpriseSetupView context={state.context} />}
    </AuthShell>
  );
}
