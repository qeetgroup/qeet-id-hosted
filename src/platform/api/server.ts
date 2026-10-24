import "server-only";

import { headers } from "next/headers";

import { clientIdFromReturnTo, fetchLoginContext, type LoginContext } from "./login-context";
import { relayHeadersFor } from "./relay";

// API access for server pages only: these calls carry the relay key, which must
// never reach the browser ("server-only" fails the build if a client imports this).

// The relay headers for the request a server page is rendering.
async function relayHeaders(): Promise<Record<string, string>> {
  return relayHeadersFor((await headers()).get("x-forwarded-for"));
}

/**
 * The login context of the application behind a return_to, fetched on behalf of
 * the visitor this page renders for. Empty without a return_to or a client.
 */
export async function getLoginContext(returnTo: string): Promise<LoginContext> {
  return fetchLoginContext(clientIdFromReturnTo(returnTo), await relayHeaders());
}
