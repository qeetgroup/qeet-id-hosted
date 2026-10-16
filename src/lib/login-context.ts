import type { BrandingDTO } from "@/lib/branding";
import { getApiBaseUrl } from "@/lib/public-config";

// A hosted-login page that has a return_to (the API's /oauth/authorize URL the
// browser was sent here with) can resolve the tenant behind that OAuth client,
// and so render on its branding.
export function clientIDFromReturnTo(returnTo: string): string {
  try {
    return new URL(returnTo).searchParams.get("client_id") ?? "";
  } catch {
    return "";
  }
}

// Fetches the branding of the tenant behind the return_to's client. Undefined
// when there is no return_to, or the client cannot be resolved — the page then
// renders the default Qeet shell.
export async function fetchBrandingForReturnTo(returnTo: string): Promise<BrandingDTO | undefined> {
  const clientID = clientIDFromReturnTo(returnTo);
  if (!clientID) return undefined;
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/v1/oauth/login-context?client_id=${encodeURIComponent(clientID)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return undefined;
    const ctx = (await res.json()) as { branding?: BrandingDTO };
    return ctx.branding;
  } catch {
    return undefined;
  }
}

// safeReturnTo guards against open redirects: we only ever bounce back to our
// own backend's /oauth/authorize endpoint. Every hosted-login page that sends
// the browser on to a return_to goes through this.
export function safeReturnTo(returnTo: string): string | null {
  if (!returnTo) return null;
  try {
    const u = new URL(returnTo);
    const base = new URL(getApiBaseUrl());
    if (u.origin === base.origin && u.pathname.endsWith("/oauth/authorize")) {
      return u.toString();
    }
  } catch {
    /* malformed — fall through */
  }
  return null;
}
