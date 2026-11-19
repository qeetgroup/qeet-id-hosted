// The browser's half of a passkey ceremony, shared by every flow that makes or uses a passkey:
// the server's options (JSON) become the browser's, the browser makes or signs the credential,
// and the credential goes back to the server as JSON. A dismissed prompt is PasskeyCancelledError.

type PKCStatic = typeof PublicKeyCredential & {
  isConditionalMediationAvailable?: () => Promise<boolean>;
  parseCreationOptionsFromJSON?: (options: unknown) => PublicKeyCredentialCreationOptions;
  parseRequestOptionsFromJSON?: (options: unknown) => PublicKeyCredentialRequestOptions;
};

type SerialisableCredential = PublicKeyCredential & { toJSON?: () => unknown };

/** A credential as the server takes it: the browser's JSON form. */
export type CredentialJSON = { [key: string]: unknown };

export class PasskeyUnsupportedError extends Error {}
export class PasskeyCancelledError extends Error {}

/** Whether this browser can make or use a passkey at all. */
export function passkeysSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.credentials
  );
}

function browserPasskeys(): PKCStatic {
  if (!passkeysSupported()) throw new PasskeyUnsupportedError();
  return window.PublicKeyCredential as PKCStatic;
}

function toJSON(credential: SerialisableCredential): CredentialJSON {
  return (credential.toJSON ? credential.toJSON() : credential) as unknown as CredentialJSON;
}

/** Whether the browser can list passkeys in a field's suggestions (conditional mediation). */
export async function conditionalMediationAvailable(): Promise<boolean> {
  if (!passkeysSupported()) return false;
  try {
    return (
      (await (window.PublicKeyCredential as PKCStatic).isConditionalMediationAvailable?.()) === true
    );
  } catch {
    return false;
  }
}

/** Makes a passkey from the server's creation options and returns it for the server. */
export async function createCredential(publicKey: unknown): Promise<CredentialJSON> {
  const PK = browserPasskeys();
  const options = PK.parseCreationOptionsFromJSON
    ? PK.parseCreationOptionsFromJSON(publicKey)
    : (publicKey as PublicKeyCredentialCreationOptions);
  const created = (await navigator.credentials.create({
    publicKey: options,
  })) as SerialisableCredential | null;
  if (!created) throw new PasskeyCancelledError();
  return toJSON(created);
}

/**
 * Signs the server's request options with a passkey the person picks and returns the assertion for
 * the server. `conditional` waits for a pick from the email field's suggestions instead of a prompt.
 */
export async function getAssertion(
  publicKey: unknown,
  options: { conditional?: boolean; signal?: AbortSignal } = {},
): Promise<CredentialJSON> {
  const PK = browserPasskeys();
  const request = PK.parseRequestOptionsFromJSON
    ? PK.parseRequestOptionsFromJSON(publicKey)
    : (publicKey as PublicKeyCredentialRequestOptions);
  const assertion = (await navigator.credentials.get({
    publicKey: request,
    ...(options.conditional ? { mediation: "conditional" as CredentialMediationRequirement } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  })) as SerialisableCredential | null;
  if (!assertion) throw new PasskeyCancelledError();
  return toJSON(assertion);
}

/** Whether a passkey call failed because the person closed the browser's prompt or it timed out. */
export function isCancelled(err: unknown): boolean {
  return (
    err instanceof PasskeyCancelledError ||
    (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "AbortError"))
  );
}
