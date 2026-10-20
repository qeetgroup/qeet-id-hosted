"use client";

import { Button } from "@qeetrix/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthCard } from "@/components/auth-card";
import { FormAlert } from "@/components/form-alert";
import { ScopeList } from "@/components/scope-list";
import { ApiError, apiPost } from "@/lib/api";
import type { Branding } from "@/lib/branding";
import { ADDRESS_NOT_ALLOWED } from "@/lib/errors";
import { goTo } from "@/lib/navigation";

// consentErrorKey names the message for an API refusal that ends this request:
// it can't be decided again from this page. Other refusals keep the buttons.
export function consentErrorKey(code: string): string | null {
  switch (code) {
    case "oidc.consent_request_invalid":
    case "unauthorized":
      return "errors.requestInvalid";
    case "oidc.redirect_uri_not_registered":
      return "errors.redirectNotRegistered";
    case ADDRESS_NOT_ALLOWED:
      return "common:errors.addressNotAllowed";
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

export function ConsentForm({
  requestId,
  scopes,
  clientName,
  branding,
}: {
  requestId: string;
  scopes: string[];
  clientName?: string;
  branding?: Branding;
}) {
  const { t } = useTranslation("consent");
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(false);

  const appName = clientName || t("common:fallbacks.application");

  // Only the recorded request's id goes with the decision: the API takes
  // every protocol value, and where the browser goes next, from its record.
  async function decide(approve: boolean) {
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ redirect?: string }>("/v1/oauth/authorize/decision", {
        request_id: requestId,
        approve,
      });
      if (res?.redirect && isWebAddress(res.redirect)) {
        goTo(res.redirect);
        return;
      }
      setEnded(true);
      setError(t("errors.noRedirect"));
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      const key = consentErrorKey(code);
      if (key) {
        setEnded(true);
        setError(t(key));
      } else {
        setError(err instanceof ApiError ? err.message : t("common:errors.generic"));
      }
    }
    setLoading(false);
  }

  return (
    <AuthCard
      branding={branding}
      className="max-w-md"
      title={t("title")}
      subtitle={
        <>
          <span className="text-foreground font-medium">{appName}</span> {t("wantsPermission")}
        </>
      }
    >
      <ScopeList scopes={scopes} />

      <FormAlert>{error}</FormAlert>

      {!ended && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={loading}
            onClick={() => decide(false)}
          >
            {t("actions.deny")}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => decide(true)}
            loading={loading}
            loadingLabel={t("actions.allowing")}
          >
            {t("actions.allow")}
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
