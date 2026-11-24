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

/** A passkey the person picked, or why the ceremony ended without one. */
type Pick = { sessionId: string; credential: CredentialJSON } | "renew" | "stop";

// One background ceremony: waits for a pick from the email field's suggestions until it is
// renewed or stopped. Cancelled, timed out or refused by the browser: stop, saying nothing.
async function pickPasskey(controller: AbortController): Promise<Pick> {
  const renew = setTimeout(() => controller.abort("renew"), RENEW_AFTER_MS);
  try {
    const begin = await beginPasskeySignIn();
    const credential = await getAssertion(begin.publicKey, {
      conditional: true,
      signal: controller.signal,
    });
    return { sessionId: begin.sessionId, credential };
  } catch {
    return controller.signal.reason === "renew" ? "renew" : "stop";
  } finally {
    clearTimeout(renew);
  }
}

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
      current = new AbortController();
      const picked = await pickPasskey(current);
      if (picked === "renew") continue;
      if (picked === "stop" || stopped) return;
      try {
        await finishPasskeySignIn(picked.sessionId, picked.credential);
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
