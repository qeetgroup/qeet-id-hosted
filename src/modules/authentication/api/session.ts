// Signing in to the hosted login: the calls that set its session cookie (qe_ls), or answer a
// second-step challenge to meet first. No call here hands a token to the page.

import { backend } from "@/platform/api/backend";
import type { Answer, Schemas } from "@/platform/api/contract";

/** One way to meet the second-step challenge, as the server lists them. */
export type LoginFactor = Schemas<"access">["LoginFactor"];

/** A second step the sign-in must meet before its session is set. */
export type MfaChallengeAnswer = Schemas<"access">["MFAChallenge"];

/**
 * What a sign-in answers: the session (cookie set) or, when the account holds a second factor or
 * must have one, a challenge. An enrolment challenge (enrollment_required) is met by setting up an
 * authenticator app; enrollment_due_at, when sent, ends the grace period it can be put off for.
 */
export type SessionResponse = { user_id?: string } | MfaChallengeAnswer;

/** The challenge a sign-in answered, or null when it signed in. */
export function challengeOf(res: SessionResponse | undefined): MfaChallengeAnswer | null {
  return res && "mfa_required" in res && res.mfa_required && res.mfa_token ? res : null;
}

/**
 * Signs in with an email and password. Naming the application (clientId) applies its
 * organisation's lockout and sign-in rules; without one, the platform's.
 */
export function signInWithPassword(input: {
  email: string;
  password: string;
  clientId: string;
}): Promise<Answer<"/v1/auth/session", "post">> {
  return backend.post("/v1/auth/session", {
    body: {
      email: input.email,
      password: input.password,
      ...(input.clientId ? { client_id: input.clientId } : {}),
    },
  });
}

/** Where a company's identity provider handed back its one-time code: SAML or OpenID Connect. */
export type HandBack = { protocol: "saml" | "oidc"; code: string };

/** Trades the one-time code a company's sign-in handed back for the session. */
export async function tradeHandBack(back: HandBack): Promise<SessionResponse> {
  return back.protocol === "saml"
    ? backend.post("/saml/session", { body: { code: back.code } })
    : backend.post("/v1/oidc-connections/session", { body: { code: back.code } });
}

/** Signs in through a company directory (LDAP) with its own user name and password. */
export function signInWithDirectory(input: {
  connectionId: string;
  username: string;
  password: string;
}): Promise<SessionResponse> {
  return backend.post("/ldap/{id}/session", {
    path: { id: input.connectionId },
    body: { username: input.username, password: input.password },
  });
}

/** Home-realm discovery: whether an address signs in through its company, and how. */
export function discoverConnections(email: string): Promise<Answer<"/v1/sso/discovery", "post">> {
  return backend.post("/v1/sso/discovery", { body: { email } });
}
