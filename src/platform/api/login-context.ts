import type { BrandingDTO } from "@/platform/branding/branding";
import { getApiBaseUrl } from "@/platform/config/public-config";

/**
 * The application a hosted page acts for, as GET /v1/oauth/login-context
 * describes it: its name, its tenant, what that tenant allows and its branding.
 * The wire shape is snake_case (see the Go loginContext handler).
 */
export type LoginContext = {
  client_name?: string;
  // The application's logo and home page, from its registration (https only); absent when unset.
  logo_uri?: string;
  client_uri?: string;
  tenant_id?: string;
  providers?: string[];
  self_registration_enabled?: boolean;
  remember_device_enabled?: boolean;
  // Which sign-in methods the organisation allows; absent = all of them.
  sign_in_methods?: { password?: boolean; passkey?: boolean; magic_link?: boolean };
  branding?: BrandingDTO;
  // The organisation's name and the settings its pages say before anyone signs in; absent when
  // the server can't read them.
  organization_name?: string;
  password_policy?: PasswordPolicy;
  magic_link_ttl_minutes?: number;
  remember_device_days?: number;
};

/** The rules the organisation's new passwords must meet; the server checks them again. */
export type PasswordPolicy = {
  min_length: number;
  require_uppercase: boolean;
  require_number: boolean;
  require_symbol: boolean;
};

// A hosted page that has a return_to (the API's /oauth/authorize URL the
// browser was sent here with) can resolve the tenant behind that OAuth client,
// and so render on its branding.
export function clientIdFromReturnTo(returnTo: string): string {
  try {
    return new URL(returnTo).searchParams.get("client_id") ?? "";
  } catch {
    return "";
  }
}

/**
 * Fetches an OAuth client's login context. Empty when there is no client, or it
 * can't be resolved: the page then renders the default Qeet shell.
 * headers: extra request headers, such as a server page's relay headers.
 */
export async function fetchLoginContext(
  clientId: string,
  headers: Record<string, string> = {},
): Promise<LoginContext> {
  if (!clientId) return {};
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/v1/oauth/login-context?client_id=${encodeURIComponent(clientId)}`,
      { cache: "no-store", headers },
    );
    if (!res.ok) return {};
    return (await res.json()) as LoginContext;
  } catch {
    return {};
  }
}

// The application a browser-side page acts for: its display name ("" when it can't be resolved),
// its logo and home page when registered, and its organisation's branding.
export type ClientContext = {
  clientName: string;
  logoUri?: string;
  clientUri?: string;
  branding?: BrandingDTO;
};

/** Fetches the name, logo, home page and branding of an OAuth client, from the browser. */
export async function fetchClientContext(clientId: string): Promise<ClientContext> {
  const ctx = await fetchLoginContext(clientId);
  return {
    clientName: ctx.client_name ?? "",
    logoUri: ctx.logo_uri,
    clientUri: ctx.client_uri,
    branding: ctx.branding,
  };
}
