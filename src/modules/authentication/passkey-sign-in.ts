// Sign in with a passkey from the button: a discoverable ceremony, so no email is needed; the
// browser lists this site's passkeys. On success the hosted login session cookie is set.

import { apiPost } from "@/platform/api/client";

export class PasskeyUnsupportedError extends Error {}
export class NoPasskeySelectedError extends Error {}

export async function signInWithPasskey(): Promise<void> {
  const PK = window.PublicKeyCredential as
    | (typeof window.PublicKeyCredential & {
        parseRequestOptionsFromJSON?: (o: unknown) => PublicKeyCredentialRequestOptions;
      })
    | undefined;
  if (!PK || !navigator.credentials) throw new PasskeyUnsupportedError();
  const begin = await apiPost<{ session_id: string; publicKey: unknown }>(
    "/v1/passkeys/login/begin",
    {},
  );
  const options = PK.parseRequestOptionsFromJSON
    ? PK.parseRequestOptionsFromJSON(begin.publicKey)
    : (begin.publicKey as PublicKeyCredentialRequestOptions);
  const assertion = (await navigator.credentials.get({ publicKey: options })) as
    | (PublicKeyCredential & { toJSON?: () => unknown })
    | null;
  if (!assertion) throw new NoPasskeySelectedError();
  await apiPost("/v1/passkeys/login/finish", {
    session_id: begin.session_id,
    credential: assertion.toJSON ? assertion.toJSON() : assertion,
  });
}
