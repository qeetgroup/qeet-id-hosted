import type { BrandingDTO } from "@/platform/branding/branding";

import { backend } from "./backend";
import type { Answer } from "./contract";

/**
 * The application a hosted page acts for, as GET /v1/oauth/login-context describes it: its name,
 * its organisation, what that organisation allows and its branding. Empty when it can't be read.
 */
export type LoginContext = Partial<Answer<"/v1/oauth/login-context">>;

/** The rules the organisation's new passwords must meet; the server checks them again. */
export type PasswordPolicy = NonNullable<LoginContext["password_policy"]>;

// A hosted page that has a return_to (the API's /oauth/authorize URL the browser was sent here
// with) can resolve the organisation behind that OAuth client, and so render on its branding.
export function clientIdFromReturnTo(returnTo: string): string {
  try {
    return new URL(returnTo).searchParams.get("client_id") ?? "";
  } catch {
    return "";
  }
}

/**
 * Fetches an OAuth client's login context. Empty when there is no client, or it can't be
 * resolved: the page then renders the default Qeet shell.
 * headers: extra request headers, such as a server page's relay headers.
 */
export async function fetchLoginContext(
  clientId: string,
  headers: Record<string, string> = {},
): Promise<LoginContext> {
  if (!clientId) return {};
  try {
    return await backend.get("/v1/oauth/login-context", {
      query: { client_id: clientId },
      headers,
    });
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
