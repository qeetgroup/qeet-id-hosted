"use client";

import { Button } from "@qeetrix/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthCard } from "@/components/auth-card";
import { fetchClientContext } from "@/lib/login-context";
import { goTo } from "@/lib/navigation";
import { getApiBaseUrl } from "@/lib/public-config";

/**
 * Asks before signing out of Qeet ID, and signs out only when the person
 * confirms: the confirmed request carries the API's ticket back to
 * /v1/oauth/logout, which ends the session and tells the applications.
 * Declining leaves the person signed in.
 */
export function LogoutConfirm({
  ticket,
  clientId,
  postLogoutRedirect,
  state,
}: {
  ticket: string;
  clientId: string;
  postLogoutRedirect: string;
  state: string;
}) {
  const { t } = useTranslation("loggedOut");
  const [appName, setAppName] = useState("");
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let live = true;
    fetchClientContext(clientId).then((ctx) => {
      if (live) setAppName(ctx.clientName);
    });
    return () => {
      live = false;
    };
  }, [clientId]);

  function signOut() {
    const q = new URLSearchParams({ logout_confirmation: ticket });
    if (clientId) q.set("client_id", clientId);
    if (postLogoutRedirect) q.set("post_logout_redirect_uri", postLogoutRedirect);
    if (state) q.set("state", state);
    goTo(`${getApiBaseUrl()}/v1/oauth/logout?${q.toString()}`);
  }

  if (!ticket) {
    return (
      <AuthCard title={t("confirm.invalidTitle")}>
        <p className="text-muted-foreground text-center text-sm">{t("confirm.invalidBody")}</p>
      </AuthCard>
    );
  }
  if (declined) {
    return (
      <AuthCard title={t("confirm.stayedTitle")}>
        <p className="text-muted-foreground text-center text-sm">{t("confirm.stayedBody")}</p>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title={t("confirm.title")}
      subtitle={appName ? t("confirm.askedBy", { app: appName }) : t("confirm.subtitle")}
    >
      <p className="text-muted-foreground text-sm">{t("confirm.body")}</p>
      <div className="flex gap-3">
        <Button variant="outline" size="lg" className="flex-1" onClick={() => setDeclined(true)}>
          {t("confirm.stay")}
        </Button>
        <Button size="lg" className="flex-1" onClick={signOut}>
          {t("confirm.signOut")}
        </Button>
      </div>
    </AuthCard>
  );
}
