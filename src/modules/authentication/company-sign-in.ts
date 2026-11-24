// Company sign-in: where an email address signs in, judged by its domain (the server's home-realm
// discovery), and the hand-back once the company's identity provider has answered. Every address
// on a domain gets the same answer, whether or not it has an account.

import { getApiBaseUrl } from "@/platform/config/public-config";

import { discoverConnections, type HandBack } from "./api/session";

/** One of the organisation's sign-in connections, as discovery names it. */
export type Connection = Awaited<ReturnType<typeof discoverConnections>>["connections"][number];

export type Company = {
  /** The name of the organisation that manages the address's domain. */
  organization?: string;
  connections: Connection[];
};

/** Where the address signs in; null when its domain isn't sent to a company's own sign-in. */
export async function discover(email: string): Promise<Company | null> {
  try {
    const res = await discoverConnections(email);
    const connections = (res.connections ?? []).filter(
      (c) =>
        (c.method === "redirect" && c.login_path) || (c.method === "credentials" && c.session_path),
    );
    if (!res.sso || connections.length === 0) return null;
    return { organization: res.organization_name || undefined, connections };
  } catch {
    // Discovery only routes: without an answer, the organisation's own ways still work, and
    // the server still refuses them for an address that must use its company's sign-in.
    return null;
  }
}

/**
 * The provider's sign-in, which comes back to this page's /sign-in once it's done, then goes on
 * to returnTo. Without an application to go back to, it returns to the account's passkeys.
 */
export function startUrl(connection: Connection, returnTo: string): string {
  const q = new URLSearchParams({ return_to: returnTo || "/security" });
  return `${getApiBaseUrl()}${connection.login_path}?${q.toString()}`;
}

/** The one-time code a company's provider handed back in the URL fragment, and whose it is. */
export function readHandBack(hash: string): HandBack | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const saml = params.get("saml_code");
  if (saml) return { protocol: "saml", code: saml };
  const oidc = params.get("oidc_code");
  if (oidc) return { protocol: "oidc", code: oidc };
  return null;
}

/**
 * A connection's name without its organisation's in front ("Brightleaf Okta" → "Okta"), as the
 * set-up names its drafts; a name that isn't only that is kept whole.
 */
export function shortName(name: string, organization?: string): string {
  const org = organization?.trim();
  if (!org) return name;
  const lead = `${org.toLowerCase()} `;
  const rest = name.toLowerCase().startsWith(lead) ? name.slice(lead.length).trim() : "";
  return rest || name;
}
