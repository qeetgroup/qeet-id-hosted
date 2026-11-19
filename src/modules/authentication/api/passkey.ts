// Passkey sign-in to the hosted login: a discoverable ceremony, so no email is needed. The finish
// is the hosted form (POST /v1/passkeys/login/session), which sets the session cookie and answers
// the user id only; the token form (login/finish) is for callers that keep tokens on a server.

import { backend } from "@/platform/api/backend";
import type { CredentialJSON } from "@/platform/webauthn/ceremony";

/** Starts a ceremony: its id and the request options for the browser. */
export function beginPasskeySignIn(): Promise<{ sessionId: string; publicKey: unknown }> {
  return backend
    .post("/v1/passkeys/login/begin", { body: {} })
    .then((res) => ({ sessionId: res.session_id, publicKey: res.publicKey }));
}

/** Finishes the ceremony with the browser's assertion; the session cookie is then set. */
export async function finishPasskeySignIn(sessionId: string, credential: CredentialJSON) {
  await backend.post("/v1/passkeys/login/session", {
    body: { session_id: sessionId, credential },
  });
}
