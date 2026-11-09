// The identity providers the guided setup knows by name, so it can give each one's own steps and
// field names. Anything else is a SAML 2.0 provider described in general words.

import type { SamlConnection } from "./api/admin-portal";

export type IdpKind = "okta" | "entra" | "google" | "other";

export const IDP_KINDS: readonly IdpKind[] = ["okta", "entra", "google", "other"];

const HOSTS: [IdpKind, RegExp][] = [
  ["okta", /(^|\.)okta(preview)?\.com$|(^|\.)okta-emea\.com$/],
  ["entra", /(^|\.)(login\.microsoftonline\.com|sts\.windows\.net|microsoftonline\.us)$/],
  ["google", /(^|\.)google\.com$/],
];

function host(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Which provider a connection signs in with: from its addresses, else its name. */
export function idpOf(c: Pick<SamlConnection, "idp_entity_id" | "idp_sso_url" | "name">): IdpKind {
  for (const url of [c.idp_sso_url, c.idp_entity_id]) {
    const h = host(url);
    const found = HOSTS.find(([, re]) => re.test(h));
    if (found) return found[0];
  }
  const name = c.name.toLowerCase();
  if (name.includes("okta")) return "okta";
  if (name.includes("entra") || name.includes("azure") || name.includes("microsoft"))
    return "entra";
  if (name.includes("google")) return "google";
  return "other";
}
