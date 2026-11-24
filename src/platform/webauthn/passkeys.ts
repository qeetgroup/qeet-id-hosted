// The signed-in person's passkeys, for the security page and the "add a passkey" offer after a
// password sign-in. Every call is authenticated by the hosted login session cookie (qe_ls) that
// sign-in set; the backend accepts it on exactly these routes: list, rename, remove, and the two
// steps of adding a passkey. Removing needs a recent sign-in (403 step_up_required otherwise), and
// the account's last way to sign in can't be removed (409 auth.last_sign_in_method).

import { backend } from "@/platform/api/backend";
import { ApiError } from "@/platform/api/client";
import type { Answer, Schemas } from "@/platform/api/contract";

import {
  createCredential,
  isCancelled,
  PasskeyUnsupportedError,
  passkeysSupported,
} from "./ceremony";

/** One of the signed-in person's passkeys. Its name is the person's text: render it as text. */
export type Passkey = Schemas<"access">["Passkey"];

/** The person's passkeys, and whether their organisation lets them add one. */
export type PasskeyList = Answer<"/v1/passkeys">;

/** The longest passkey name the backend accepts, in characters. */
export const PASSKEY_NAME_MAX_LENGTH = 64;

export function listPasskeys(): Promise<PasskeyList> {
  return backend.get("/v1/passkeys");
}

export function renamePasskey(id: string, name: string): Promise<Passkey> {
  return backend.patch("/v1/passkeys/{id}", { path: { id }, body: { name } });
}

/** Removes one of the signed-in person's passkeys. */
export async function removePasskey(id: string): Promise<void> {
  await backend.delete("/v1/passkeys/{id}", { path: { id } });
}

/**
 * Whether to offer adding a passkey right after a password sign-in: the browser can make one, the
 * person's organisation allows passkeys, and the person has none yet. Any failure, or no answer
 * within timeoutMs, means "no", so the check never stands between the person and the application.
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
 * Adds a passkey for the signed-in person: the server's creation options, the browser's new
 * credential, then the credential back to the server. An empty name lets the server name it after
 * this browser (e.g. "Chrome on macOS"); it can be renamed later.
 */
export async function addPasskey(name: string): Promise<void> {
  if (!passkeysSupported()) throw new PasskeyUnsupportedError();
  const begin = await backend.post("/v1/passkeys/register/begin");
  const credential = await createCredential(begin.publicKey);
  await backend.post("/v1/passkeys/register/finish", {
    body: { session_id: begin.session_id, credential, name: name.trim() },
  });
}

/**
 * The `security` translation key for a failed passkey call. Backend messages are never shown;
 * known codes get their own copy, anything else a generic one.
 */
export function passkeyErrorKey(err: unknown): string {
  if (err instanceof PasskeyUnsupportedError) return "errors.unsupported";
  // The browser rejects with NotAllowedError when the person dismisses its prompt or it times
  // out, and InvalidStateError when this authenticator already holds a passkey for the account.
  if (isCancelled(err)) return "errors.cancelled";
  if (err instanceof DOMException && err.name === "InvalidStateError") {
    return "errors.alreadyRegistered";
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
