"use client";

import { Spinner } from "@qeetrix/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { readConsentRequest } from "@/modules/oauth/api/consent";
import { type Account, fetchSignedInAccount } from "@/platform/api/account";
import { ApiError } from "@/platform/api/client";
import { fetchClientContext } from "@/platform/api/login-context";
import { type Branding, normalizeBranding } from "@/platform/branding/branding";
import { HostedPage } from "@/platform/components/hosted-page";

import { ConsentForm, type Ended, EndedPage, endedBy } from "./consent-form";

type State =
  | { kind: "loading" }
  | {
      kind: "ready";
      requestId: string;
      scopes: string[];
      clientName: string;
      clientLogoUri?: string;
      clientUri?: string;
      account: Account | null;
      branding?: Branding;
    }
  | { kind: "ended"; ended: Ended };

/**
 * Loads the recorded authorization request by its id (the address carries nothing else), then the
 * application it is for and who is signed in, and asks the person to decide. A request that can't
 * be read (unknown, expired, answered, or another sign-in's) has ended, with nothing of it shown.
 */
export function ConsentPage({ requestId }: { requestId: string }) {
  const { t } = useTranslation("consent");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    (async () => {
      if (!requestId) {
        setState({ kind: "ended", ended: "ended" });
        return;
      }
      try {
        const req = await readConsentRequest(requestId);
        const [ctx, account] = await Promise.all([
          fetchClientContext(req.clientId),
          fetchSignedInAccount(),
        ]);
        if (!live) return;
        setState({
          kind: "ready",
          requestId: req.requestId,
          scopes: req.scopes,
          clientName: ctx.clientName,
          clientLogoUri: ctx.logoUri,
          clientUri: ctx.clientUri,
          account,
          branding: normalizeBranding(ctx.branding),
        });
      } catch (err) {
        if (!live) return;
        setState({
          kind: "ended",
          ended: endedBy(err instanceof ApiError ? err.code : "") ?? "ended",
        });
      }
    })();
    return () => {
      live = false;
    };
  }, [requestId]);

  if (state.kind === "ready") return <ConsentForm {...state} />;
  if (state.kind === "ended") return <EndedPage ended={state.ended} clientName="" />;
  return (
    <HostedPage single title={t("loading")}>
      <div role="status" className="flex items-center gap-3 py-2">
        <Spinner size="md" tone="brand" label={t("loading")} />
      </div>
    </HostedPage>
  );
}
