// A new account in the application's organisation, made from the hosted sign-up page: with a
// password, or passkey first with no password at all. The server re-checks that the organisation
// lets people sign themselves up, and answers a taken address with the same neutral refusal.

import { backend } from "@/platform/api/backend";
import type { CredentialJSON } from "@/platform/webauthn/ceremony";

import type { SessionResponse } from "./session";

type NewAccount = { organizationId: string; email: string; name: string };

/** Makes the account with a password and signs it in, or answers the second step to set up. */
export function signUpWithPassword(
  input: NewAccount & { password: string },
): Promise<SessionResponse> {
  return backend.post("/v1/auth/register", {
    body: {
      organization_id: input.organizationId,
      email: input.email,
      password: input.password,
      display_name: input.name,
    },
  });
}

/** Starts a passkey-first sign-up: the ceremony's id and the creation options for the browser. */
export function beginPasskeySignUp(
  input: NewAccount,
): Promise<{ sessionId: string; publicKey: unknown }> {
  return backend
    .post("/v1/register/passkey/begin", {
      body: { organization_id: input.organizationId, email: input.email, display_name: input.name },
    })
    .then((res) => ({ sessionId: res.session_id, publicKey: res.publicKey }));
}

/** Finishes it with the browser's new credential; the account is made and signed in. */
export async function finishPasskeySignUp(sessionId: string, credential: CredentialJSON) {
  await backend.post("/v1/register/passkey/finish", {
    body: { session_id: sessionId, credential, name: "" },
  });
}
