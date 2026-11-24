"use client";

import { Button, Text } from "@qeetrix/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { type Account, fetchSignedInAccount } from "@/platform/api/account";
import { fetchClientContext } from "@/platform/api/login-context";
import { type Branding, normalizeBranding } from "@/platform/branding/branding";
import { AccountChip } from "@/platform/components/account-chip";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { getApiBaseUrl } from "@/platform/config/public-config";
import { goTo } from "@/platform/navigation/go-to";

/**
 * Asks before signing out of Qeet ID, for a sign-out that came without proof of who signed in, so
 * a link or an image can't sign anyone out. Only Sign out carries the server's ticket back to
 * /v1/oauth/logout, which ends the session and tells the applications; Stay signed in changes
 * nothing.
 */
export function SignOutConfirm({
  ticket,
  clientId,
  postLogoutRedirect,
  state,
}: Readonly<{
  ticket: string;
  clientId: string;
  postLogoutRedirect: string;
  state: string;
}>) {
  const { t } = useTranslation("signOut");
  const [appName, setAppName] = useState("");
  const [branding, setBranding] = useState<Branding | undefined>();
  const [account, setAccount] = useState<Account | null>(null);
  const [stayed, setStayed] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchSignedInAccount().then((a) => live && setAccount(a));
    if (clientId) {
      void fetchClientContext(clientId).then((ctx) => {
        if (!live) return;
        setAppName(ctx.clientName);
        setBranding(normalizeBranding(ctx.branding));
      });
    }
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

  if (!ticket || stayed) {
    const key = stayed ? "stayed" : "invalid";
    return (
      <HostedPage
        single
        status={stayed ? "success" : "warning"}
        branding={branding}
        title={t(`confirm.${key}Title`)}
        description={t(`confirm.${key}Body`)}
      />
    );
  }

  return (
    <HostedPage
      single
      branding={branding}
      title={t("confirm.title")}
      description={appName ? t("confirm.asked", { app: appName }) : t("confirm.plain")}
      lead={account ? <AccountChip email={account.email} name={account.name} /> : undefined}
    >
      <FormStack>
        <Text size="md" render={<p />}>
          {t("confirm.apps")}
        </Text>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="soft" size="lg" fullWidth onClick={() => setStayed(true)}>
            {t("confirm.stay")}
          </Button>
          <Button type="button" size="lg" fullWidth onClick={signOut}>
            {t("confirm.signOut")}
          </Button>
        </div>
      </FormStack>
    </HostedPage>
  );
}
