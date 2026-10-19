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

// The hosted login's own pages a sign-in may continue to, given as
// root-relative paths: the device flow sends a signed-out user to sign in on
// the way to approving a device.
const LOCAL_RETURN_PATHS = ["/device"];

// Stands in for this site's origin when resolving a root-relative path.
const LOCAL_ORIGIN = "https://hosted-login.invalid";

// safeReturnTo guards against open redirects: we only ever bounce back to our
// own backend's /oauth/authorize endpoint, or to one of the pages above. Every
// hosted-login page that sends the browser on to a return_to goes through this.
export function safeReturnTo(returnTo: string): string | null {
  if (!returnTo) return null;
  if (returnTo.startsWith("/")) return safeLocalPath(returnTo);
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

// A root-relative path to an allowed page, as path + query, or null. It must
// start with a single "/" and hold no backslash, both as given and once decoded,
// and still name an allowed page on this site once resolved.
function safeLocalPath(path: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  for (const p of [path, decoded]) {
    if (p.startsWith("//") || p.includes("\\")) return null;
  }
  const u = new URL(path, LOCAL_ORIGIN);
  if (u.origin !== LOCAL_ORIGIN || !LOCAL_RETURN_PATHS.includes(u.pathname)) return null;
  return u.pathname + u.search;
}

// True when a sign-in is on its way to approve a device.
export function returnsToDevice(returnTo: string): boolean {
  const dest = safeReturnTo(returnTo);
  return dest !== null && new URL(dest, LOCAL_ORIGIN).pathname === "/device";
}
