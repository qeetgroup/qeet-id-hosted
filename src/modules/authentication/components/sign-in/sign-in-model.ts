// The sign-in page's rules, apart from its screens: which ways the organisation leaves open, what a
// refusal means for the page, and the pending second step a sign-in can answer.

import type { LoginFactor, MfaChallengeAnswer } from "@/modules/authentication/api/session";
import { getApiBaseUrl } from "@/platform/config/public-config";
import { isCancelled, PasskeyUnsupportedError } from "@/platform/webauthn/ceremony";

import { type Problem, problemOf } from "../../sign-in-problems";

export type Step = "email" | "password" | "link" | "company" | "finishing" | "mfa" | "offer";

/** The second step a sign-in must meet: held in memory only, never in the URL or storage. */
export type Pending = {
  token: string;
  factors: LoginFactor[];
  enrollment: { dueAt?: string } | null;
  /** Met after a company's sign-in, which goes straight on: no passkey offer. */
  company?: boolean;
};

/** The pending step a sign-in's challenge asks for. */
export function pendingOf(challenge: MfaChallengeAnswer, company = false): Pending {
  return {
    token: challenge.mfa_token,
    factors: challenge.factors ?? [],
    enrollment: challenge.enrollment_required ? { dueAt: challenge.enrollment_due_at } : null,
    ...(company ? { company: true } : {}),
  };
}

/**
 * What the application asked for in its authorize request: a fresh sign-in (prompt=login), and
 * the account to sign in (login_hint).
 */
export function authorizeHints(returnTo: string): { fresh: boolean; hint: string } {
  try {
    const q = new URL(returnTo).searchParams;
    return {
      fresh: (q.get("prompt") ?? "").split(" ").includes("login"),
      hint: q.get("login_hint") ?? "",
    };
  } catch {
    return { fresh: false, hint: "" };
  }
}

/** The ways the organisation allows, as the page offers them. */
export type Ways = {
  /** An email first, then a password or a sign-in link. */
  emailEnabled: boolean;
  /** A sign-in link, which needs the application's organisation. */
  linkAllowed: boolean;
  /** Social accounts: only for an application's own organisation. */
  providers: string[];
  /** Qeet ID's own way on from the email, when the organisation allows one. */
  ownWay: Step | null;
};

export function waysOf(input: {
  passwordEnabled: boolean;
  magicLinkEnabled: boolean;
  organizationId: string;
  returnTo: string;
  providers: string[];
}): Ways {
  const linkAllowed = input.magicLinkEnabled && input.organizationId !== "";
  let ownWay: Step | null = null;
  if (input.passwordEnabled) ownWay = "password";
  else if (linkAllowed) ownWay = "link";
  return {
    emailEnabled: input.passwordEnabled || linkAllowed,
    linkAllowed,
    providers: input.organizationId !== "" && input.returnTo !== "" ? input.providers : [],
    ownWay,
  };
}

/** What the page says when the passkey button's sign-in fails. */
export function passkeyProblem(err: unknown): Problem {
  if (err instanceof PasskeyUnsupportedError) return { kind: "passkeyUnsupported" };
  if (isCancelled(err) || err instanceof DOMException) return { kind: "passkey" };
  return problemOf(err);
}

/** What the page says when a company's hand-back can't be traded: its own words, else one. */
export function handBackProblem(err: unknown): Problem {
  const problem = problemOf(err);
  return problem.kind === "server" || problem.kind === "generic" ? { kind: "company" } : problem;
}

/**
 * The server's social sign-in for the organisation's own providers, which sets the session on the
 * provider's callback and returns to the authorize URL.
 */
export function socialStartUrl(provider: string, organizationId: string, returnTo: string): string {
  const q = new URLSearchParams({ organization_id: organizationId, return_to: returnTo });
  return `${getApiBaseUrl()}/v1/social/${encodeURIComponent(provider)}/start?${q}`;
}
