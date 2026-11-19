import { useCallback, useEffect, useState } from "react";

import {
  getScimConfig,
  listDomains,
  listSamlConnections,
  type PortalContext,
  type PortalDomain,
  type SamlConnection,
  type SamlTestSignIn,
  type ScimConfig,
} from "@/modules/enterprise-setup/api/admin-portal";

export type StepId = "domain" | "connect" | "test" | "turnOn" | "scim";

export type Setup = {
  domains: PortalDomain[];
  connection: SamlConnection | null;
  scim: ScimConfig | null;
};

/** Each step the link allows, in the order the work is done, with whether it's finished. */
export function stepsOf(
  context: PortalContext,
  setup: Setup,
  local: { test: SamlTestSignIn | null; scimSkipped: boolean },
): { id: StepId; done: boolean }[] {
  const can = (c: string) => context.capabilities.includes(c as never);
  const verified = setup.domains.filter((d) => d.status === "verified");
  const c = setup.connection;
  const connected = Boolean(c?.idp_entity_id);
  const active = c?.status === "active";
  const steps: { id: StepId; done: boolean }[] = [];
  if (can("domain_verification")) steps.push({ id: "domain", done: verified.length > 0 });
  if (can("saml")) {
    steps.push({ id: "connect", done: connected });
    steps.push({ id: "test", done: active || local.test?.status === "succeeded" });
    steps.push({
      id: "turnOn",
      done: active && (!can("domain_verification") || verified.some((d) => d.sso_enabled)),
    });
  }
  if (can("scim"))
    steps.push({ id: "scim", done: Boolean(setup.scim?.token_set) || local.scimSkipped });
  return steps;
}

/** The connection the setup works on: the live one, else the latest draft. */
function pick(items: SamlConnection[]): SamlConnection | null {
  return (
    items.find((c) => c.status === "active") ??
    [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ??
    null
  );
}

/** Loads what the link may see: its domains, its SAML connection and its SCIM token. */
export function useSetup(context: PortalContext) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    const can = (c: string) => context.capabilities.includes(c as never);
    try {
      const [domains, saml, scim] = await Promise.all([
        can("domain_verification") ? listDomains() : Promise.resolve([]),
        can("saml") ? listSamlConnections() : Promise.resolve([]),
        can("scim") ? getScimConfig() : Promise.resolve(null),
      ]);
      setSetup({ domains, connection: pick(saml), scim });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [context]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { setup, failed, reload, setSetup };
}
