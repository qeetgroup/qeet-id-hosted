"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@qeetrix/ui";
import type { PortalContext } from "@/modules/enterprise-setup/api/admin-portal";

import { SamlPanel } from "./saml-panel";
import { ScimPanel } from "./scim-panel";

type Props = {
  context: PortalContext;
};

export function EnterpriseSetupView({ context }: Props) {
  const hasSaml = context.capabilities.includes("saml");
  const hasScim = context.capabilities.includes("scim");
  const defaultTab = hasSaml ? "saml" : "scim";

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Configure SSO for {context.tenant_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          This link expires {new Date(context.expires_at).toLocaleString()}. You can return to it
          until then.
        </p>
      </div>

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
    </div>
  );
}
