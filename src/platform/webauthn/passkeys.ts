// The signed-in user's passkeys, for the security page and the "add a passkey"
// prompt after a password sign-in. Every call is authenticated by the hosted
// login session cookie (qe_ls) that sign-in set; the backend accepts it on
// exactly these routes: list, rename, and the two steps of adding a passkey.
// Mutations carry the CSRF token through src/platform/api/client.ts. Removing a passkey is
// not offered here: the backend allows that with a bearer token only.

import { ApiError, apiGet, apiPatch, apiPost } from "@/platform/api/client";

/** One of the signed-in user's passkeys, as GET /v1/passkeys returns it. */
export type Passkey = {
  id: string;
  /** User-supplied text: render it as text, never as markup. */
  name?: string | null;
  created_at: string;
  last_used_at?: string | null;
};

export type PasskeyList = {
  items: Passkey[];
  /** False when the user's organization has passkeys switched off. */
  enrollment_allowed: boolean;
};

/** The longest passkey name the backend accepts, in characters. */
export const PASSKEY_NAME_MAX_LENGTH = 64;

export function listPasskeys(): Promise<PasskeyList> {
  return apiGet<PasskeyList>("/v1/passkeys");
}

export function renamePasskey(id: string, name: string): Promise<Passkey> {
  return apiPatch<Passkey>(`/v1/passkeys/${encodeURIComponent(id)}`, { name });
}

/** Whether this browser can create a passkey at all. */
export function passkeysSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.credentials
  );
}

/**
 * Whether to offer adding a passkey right after a password sign-in: the browser
 * can create one, the user's organization allows passkeys, and the user has
 * none yet. Any failure, or no answer within timeoutMs, means "no", so the
 * check never stands between the user and the application.
 */
export async function shouldOfferPasskey(timeoutMs = 3000): Promise<boolean> {
  if (!passkeysSupported()) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });
    const list = await Promise.race([listPasskeys(), timeout]);
    return list.enrollment_allowed === true && list.items.length === 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Adds a passkey for the signed-in user: asks the backend for creation options,
 * lets the browser create the credential, then sends the attestation back. An
 * empty name lets the backend name it after this browser (e.g. "Chrome on
 * macOS"); it can be renamed later.
 */
export async function addPasskey(name: string): Promise<void> {
  const PK = window.PublicKeyCredential as
    | (typeof window.PublicKeyCredential & {
        parseCreationOptionsFromJSON?: (o: unknown) => PublicKeyCredentialCreationOptions;
      })
    | undefined;
  if (!PK || !navigator.credentials) throw new PasskeyUnsupportedError();
  const begin = await apiPost<{ session_id: string; publicKey: unknown }>(
    "/v1/passkeys/register/begin",
  );
  const options = PK.parseCreationOptionsFromJSON
    ? PK.parseCreationOptionsFromJSON(begin.publicKey)
    : (begin.publicKey as PublicKeyCredentialCreationOptions);
  const created = (await navigator.credentials.create({ publicKey: options })) as
    | (PublicKeyCredential & { toJSON?: () => unknown })
    | null;
  if (!created) throw new PasskeyCancelledError();
  await apiPost("/v1/passkeys/register/finish", {
    session_id: begin.session_id,
    credential: created.toJSON ? created.toJSON() : created,
    name: name.trim(),
  });
}

export class PasskeyUnsupportedError extends Error {}
export class PasskeyCancelledError extends Error {}

/**
 * The `security` translation key for a failed passkey call. Backend messages
 * are never shown; known codes get their own copy, anything else a generic one.
 */
export function passkeyErrorKey(err: unknown): string {
  if (err instanceof PasskeyUnsupportedError) return "errors.unsupported";
  // The browser rejects with NotAllowedError when the user dismisses its
  // prompt or it times out, and InvalidStateError when this authenticator
  // already holds a passkey for the account.
  if (err instanceof PasskeyCancelledError) return "errors.cancelled";
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "AbortError") return "errors.cancelled";
    if (err.name === "InvalidStateError") return "errors.alreadyRegistered";
  }
  if (err instanceof ApiError) {
    switch (err.code) {
      case "unauthorized":
        return "errors.signedOut";
      case "passkey.disabled":
        return "errors.disabled";
      case "passkey.already_registered":
        return "errors.alreadyRegistered";
      case "auth.session_expired":
        return "errors.expired";
      case "validation_failed":
        return "errors.invalidName";
      case "csrf_failed":
      case "http_403":
        return "errors.refused";
    }
  }
  return "errors.generic";
}
