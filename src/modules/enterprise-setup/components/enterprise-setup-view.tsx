"use client";

import { Tab, Tabs, TabsList, TabsPanel, Text } from "@qeetrix/react";
import { useTranslation } from "react-i18next";

import type { PortalContext } from "@/modules/enterprise-setup/api/admin-portal";
import type { Branding } from "@/platform/branding/branding";
import { HostedPage } from "@/platform/components/hosted-page";

import { SamlPanel } from "./saml-panel";
import { ScimPanel } from "./scim-panel";

/** The setup itself, as a page of its own: SAML and SCIM, each in a tab when the link allows it. */
export function EnterpriseSetupView({
  context,
  branding,
}: {
  context: PortalContext;
  branding?: Branding;
}) {
  const { t, i18n } = useTranslation("enterpriseSetup");
  const hasSaml = context.capabilities.includes("saml");
  const hasScim = context.capabilities.includes("scim");
  const expires = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(context.expires_at));

  return (
    <HostedPage
      kind="page"
      width="lg"
      branding={branding}
      title={t("view.title", { tenant: context.tenant_name })}
      description={t("view.expires", { date: expires })}
      barEnd={
        <Text size="sm" tone="subtle" className="text-end">
          {t("view.bar")}
        </Text>
      }
    >
      <Tabs defaultValue={hasSaml ? "saml" : "scim"}>
        <TabsList>
          {hasSaml && <Tab value="saml">SAML</Tab>}
          {hasScim && <Tab value="scim">SCIM</Tab>}
        </TabsList>
        {hasSaml && (
          <TabsPanel value="saml" className="pt-6">
            <SamlPanel />
          </TabsPanel>
        )}
        {hasScim && (
          <TabsPanel value="scim" className="pt-6">
            <ScimPanel />
          </TabsPanel>
        )}
      </Tabs>
    </HostedPage>
  );
}
