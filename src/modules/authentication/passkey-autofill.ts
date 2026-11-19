// Passkey sign-in from the browser's own credential prompt (autofill). As the sign-in form loads,
// a discoverable sign-in ceremony starts in the background with conditional mediation: the
// browser lists the person's passkeys for this site in the email field's suggestions, and picking
// one signs in with nothing typed. Where the browser lacks conditional mediation nothing starts.
// The ceremony is renewed before the server's ceremony state expires, and stopped silently when
// the person signs in another way; a cancelled, timed-out or replaced ceremony is never reported.
// A passkey the person picked that the server refuses (for example a cloned credential) is.

import { ApiError } from "@/platform/api/client";
import {
  type CredentialJSON,
  conditionalMediationAvailable,
  getAssertion,
} from "@/platform/webauthn/ceremony";

import { beginPasskeySignIn, finishPasskeySignIn } from "./api/passkey";

// The server keeps a ceremony for five minutes; renew a little before that.
const RENEW_AFTER_MS = 4.5 * 60 * 1000;

/**
 * Starts the background ceremony and returns a function that stops it. onSignedIn runs once the
 * picked passkey has signed in; onError for a picked passkey the server refused.
 */
export function startPasskeyAutofill(
  onSignedIn: () => void,
  onError: (err: unknown) => void,
): () => void {
  let stopped = false;
  let current: AbortController | null = null;

  (async () => {
    if (!(await conditionalMediationAvailable())) return;
    while (!stopped) {
      const controller = new AbortController();
      current = controller;
      const renew = setTimeout(() => controller.abort("renew"), RENEW_AFTER_MS);
      let credential: CredentialJSON;
      let sessionId: string;
      try {
        const begin = await beginPasskeySignIn();
        sessionId = begin.sessionId;
        credential = await getAssertion(begin.publicKey, {
          conditional: true,
          signal: controller.signal,
        });
      } catch {
        clearTimeout(renew);
        // Renewed: start a fresh ceremony. Stopped, cancelled, or the browser gave up: say nothing.
        if (controller.signal.reason === "renew" && !stopped) continue;
        return;
      }
      clearTimeout(renew);
      if (stopped) return;
      try {
        await finishPasskeySignIn(sessionId, credential);
        onSignedIn();
        return;
      } catch (err) {
        // The ceremony state ran out while the prompt was open: start again.
        if (err instanceof ApiError && err.code === "auth.session_expired") continue;
        onError(err);
        return;
      }
    }
  })().catch(() => {});

  return () => {
    stopped = true;
    current?.abort("stop");
  };
}
