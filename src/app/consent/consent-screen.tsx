"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthCard } from "@/components/auth-card";
import { AuthShell } from "@/components/auth-shell";
import { FormAlert } from "@/components/form-alert";
import { ApiError, apiGet } from "@/lib/api";
import { type Branding, normalizeBranding } from "@/lib/branding";
import { fetchClientContext } from "@/lib/login-context";

import { ConsentForm, consentErrorKey } from "./consent-form";

// The request as the API recorded it. The hosted-login session cookie (sent
// with the request) is what lets this browser read it.
type RecordedRequest = { request_id: string; client_id: string; scope: string };

type State =
  | { kind: "loading" }
  | { kind: "ready"; requestId: string; scopes: string[]; clientName: string; branding?: Branding }
  | { kind: "refused"; messageKey: string };

/**
 * Loads the recorded authorization request by its id, then the name and
 * branding of the application it is for, and asks the person to decide on
 * it. A request that can't be read (unknown, expired, already decided, or
 * another sign-in's) is refused here, with nothing of it shown.
 */
export function ConsentScreen({ requestId }: { requestId: string }) {
  const { t } = useTranslation("consent");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    (async () => {
      if (!requestId) {
        setState({ kind: "refused", messageKey: "errors.requestInvalid" });
        return;
      }
      try {
        const req = await apiGet<RecordedRequest>(
          `/v1/oauth/authorize/request?request_id=${encodeURIComponent(requestId)}`,
        );
        const ctx = await fetchClientContext(req.client_id);
        if (!live) return;
        setState({
          kind: "ready",
          requestId: req.request_id,
          scopes: req.scope.split(/\s+/).filter(Boolean),
          clientName: ctx.clientName,
          branding: normalizeBranding(ctx.branding),
        });
      } catch (err) {
        if (!live) return;
        setState({
          kind: "refused",
          messageKey:
            consentErrorKey(err instanceof ApiError ? err.code : "") ?? "errors.requestInvalid",
        });
      }
    })();
    return () => {
      live = false;
    };
  }, [requestId]);

  if (state.kind === "ready") {
    return (
      <AuthShell branding={state.branding}>
        <ConsentForm
          requestId={state.requestId}
          scopes={state.scopes}
          clientName={state.clientName}
          branding={state.branding}
        />
      </AuthShell>
    );
  }
  return (
    <AuthShell>
      <AuthCard className="max-w-md" title={t("title")}>
        {state.kind === "loading" ? (
          <p className="text-muted-foreground text-sm" role="status">
            {t("loading")}
          </p>
        ) : (
          <FormAlert>{t(state.messageKey)}</FormAlert>
        )}
      </AuthCard>
    </AuthShell>
  );
}
