// Signing this browser out of the hosted login, for the security page and for "use another
// account" on the device page.

import { backend } from "./backend";

/**
 * Ends this browser's hosted login session and clears its cookie. Resolves to the applications'
 * front-channel sign-out addresses, which the signed-out page loads to sign the browser out of
 * each; empty when there are none, or no one was signed in.
 */
export async function signOutHostedSession(): Promise<string[]> {
  const res = await backend.delete("/v1/auth/session");
  return res?.frontchannel_logout_uris ?? [];
}
