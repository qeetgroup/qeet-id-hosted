// Passkey sign-in from the browser's own credential prompt (autofill). As the
// sign-in form loads, a discoverable sign-in ceremony starts in the background
// with conditional mediation: the browser lists the user's passkeys for this
// site in the email field's suggestions, and picking one signs in with nothing
// typed. Where the browser lacks conditional mediation nothing starts. The
// ceremony is renewed before the server's ceremony state expires, and stopped
// silently when the user signs in another way; a cancelled, timed-out or
// replaced ceremony is never reported. A passkey the user picked that the
// server refuses (for example a cloned credential) is reported.

import { ApiError, apiPost } from "@/lib/api";

type PKCStatic = typeof PublicKeyCredential & {
  isConditionalMediationAvailable?: () => Promise<boolean>;
  parseRequestOptionsFromJSON?: (o: unknown) => PublicKeyCredentialRequestOptions;
};

// The server keeps a ceremony for five minutes; renew a little before that.
const RENEW_AFTER_MS = 4.5 * 60 * 1000;

export async function conditionalMediationAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential || !navigator.credentials) {
    return false;
  }
  const PK = window.PublicKeyCredential as PKCStatic;
  try {
    return (await PK.isConditionalMediationAvailable?.()) === true;
  } catch {
    return false;
  }
}

/**
 * Starts the background ceremony and returns a function that stops it.
 * onSignedIn runs once the picked passkey has signed in; onError for a picked
 * passkey the server refused.
 */
export function startPasskeyAutofill(onSignedIn: () => void, onError: (message: string) => void): () => void {
  let stopped = false;
  let current: AbortController | null = null;

  (async () => {
    if (!(await conditionalMediationAvailable())) return;
    const PK = window.PublicKeyCredential as PKCStatic;
    while (!stopped) {
      const controller = new AbortController();
      current = controller;
      const renew = setTimeout(() => controller.abort("renew"), RENEW_AFTER_MS);
      let credential: (PublicKeyCredential & { toJSON?: () => unknown }) | null;
      let sessionId: string;
      try {
        const begin = await apiPost<{ session_id: string; publicKey: unknown }>("/v1/passkeys/login/begin", {});
        sessionId = begin.session_id;
        const options = PK.parseRequestOptionsFromJSON
          ? PK.parseRequestOptionsFromJSON(begin.publicKey)
          : (begin.publicKey as PublicKeyCredentialRequestOptions);
        credential = (await navigator.credentials.get({
          publicKey: options,
          mediation: "conditional",
          signal: controller.signal,
        } as CredentialRequestOptions)) as typeof credential;
      } catch {
        clearTimeout(renew);
        // Renewed: start a fresh ceremony. Stopped, cancelled, or the browser
        // gave up: say nothing.
        if (controller.signal.reason === "renew" && !stopped) continue;
        return;
      }
      clearTimeout(renew);
      if (!credential || stopped) return;
      try {
        await apiPost("/v1/passkeys/login/finish", {
          session_id: sessionId,
          credential: credential.toJSON ? credential.toJSON() : credential,
        });
        onSignedIn();
        return;
      } catch (err) {
        // The ceremony state ran out while the prompt was open: start again.
        if (err instanceof ApiError && err.code === "auth.session_expired") continue;
        onError(err instanceof ApiError ? err.message : "");
        return;
      }
    }
  })().catch(() => {});

  return () => {
    stopped = true;
    current?.abort("stop");
  };
}
