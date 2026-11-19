// The second step of a hosted sign-in. Each call carries the in-memory challenge token
// (mfa_token), never stored or put in the URL; the one that meets it sets the session cookie.

import { backend } from "@/platform/api/backend";
import { ApiError } from "@/platform/api/client";
import type { Answer, Body } from "@/platform/api/contract";

type Proof = Omit<Body<"/v1/auth/session/mfa", "post">, "mfa_token">;

/**
 * Meets the challenge with one proof (a code, a passkey, an approved push, or skip while an
 * enrolment may be put off). Answers the recovery codes when it completed a new enrolment.
 */
export function completeSecondStep(
  mfaToken: string,
  proof: Proof,
): Promise<Answer<"/v1/auth/session/mfa", "post">> {
  return backend.post("/v1/auth/session/mfa", { body: { mfa_token: mfaToken, ...proof } });
}

/** Sends a code to the email address or phone a factor names. */
export async function sendSecondStepCode(mfaToken: string, factorId: string) {
  await backend.post("/v1/auth/mfa/send", { body: { mfa_token: mfaToken, factor_id: factorId } });
}

/** Asks the person's phone to approve; answers the number the phone asks for and when it ends. */
export function sendPushRequest(mfaToken: string): Promise<Answer<"/v1/auth/mfa/push", "post">> {
  return backend.post("/v1/auth/mfa/push", { body: { mfa_token: mfaToken } });
}

/** An authenticator app to set up: its secret, and the link its QR code carries. */
export type AppEnrollment = { secret: string; provisioning_url: string };

/**
 * Starts setting up an authenticator app. The server always sends both fields (its Go struct has
 * no omitempty) though the document leaves them optional; a missing one fails closed.
 */
export async function startAppEnrollment(mfaToken: string): Promise<AppEnrollment> {
  const res = await backend.post("/v1/auth/mfa/enroll", { body: { mfa_token: mfaToken } });
  if (!res.secret || !res.provisioning_url) {
    throw new ApiError(502, "client.schema_mismatch", "The server's answer was incomplete.");
  }
  return { secret: res.secret, provisioning_url: res.provisioning_url };
}

/** Starts a passkey ceremony that meets the challenge. */
export function beginPasskeySecondStep(
  mfaToken: string,
): Promise<{ sessionId: string; publicKey: unknown }> {
  return backend
    .post("/v1/auth/mfa/passkey/begin", { body: { mfa_token: mfaToken } })
    .then((res) => ({ sessionId: res.session_id ?? "", publicKey: res.publicKey }));
}
