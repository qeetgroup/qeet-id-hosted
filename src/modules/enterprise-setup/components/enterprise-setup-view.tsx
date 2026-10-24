"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@qeetrix/ui";
import { useTranslation } from "react-i18next";
import type { PortalContext } from "@/modules/enterprise-setup/api/admin-portal";
import type { Branding } from "@/platform/branding/branding";
import { AuthCard } from "@/platform/components/auth-card";

import { SamlPanel } from "./saml-panel";
import { ScimPanel } from "./scim-panel";

type Props = {
  context: PortalContext;
  branding?: Branding;
};

/** The setup screen, in the same card as every hosted page (the page widens it for the forms). */
export function EnterpriseSetupView({ context, branding }: Props) {
  const { t } = useTranslation("enterpriseSetup");
  const hasSaml = context.capabilities.includes("saml");
  const hasScim = context.capabilities.includes("scim");
  const defaultTab = hasSaml ? "saml" : "scim";

  return (
    <AuthCard
      branding={branding}
      title={t("view.title", { tenant: context.tenant_name })}
      subtitle={t("view.expires", { date: new Date(context.expires_at).toLocaleString() })}
    >
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {hasSaml && <TabsTrigger value="saml">SAML</TabsTrigger>}
          {hasScim && <TabsTrigger value="scim">SCIM</TabsTrigger>}
        </TabsList>
        {hasSaml && (
          <TabsContent value="saml">
            <SamlPanel />
          </TabsContent>
        )}
        {hasScim && (
          <TabsContent value="scim">
            <ScimPanel />
          </TabsContent>
        )}
      </Tabs>
    </AuthCard>
  );
}
