// Sign in with a passkey from the button: a discoverable ceremony, so no email is needed; the
// browser lists this site's passkeys. On success the hosted login session cookie is set.

import { getAssertion } from "@/platform/webauthn/ceremony";

import { beginPasskeySignIn, finishPasskeySignIn } from "./api/passkey";

export async function signInWithPasskey(): Promise<void> {
  const begin = await beginPasskeySignIn();
  const credential = await getAssertion(begin.publicKey);
  await finishPasskeySignIn(begin.sessionId, credential);
}
