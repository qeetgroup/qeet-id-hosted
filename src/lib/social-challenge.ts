import type { LoginFactor } from "@/components/mfa-challenge";

// A hosted social sign-in that must meet a second factor comes back to /sign-in
// with the challenge in the URL fragment — which the browser never sends to a
// server or in a Referer — instead of a session: the challenge token, its
// methods, the factors it can be met with (JSON, as a password sign-in's
// challenge lists them), and for an enrolment challenge enrollment_required
// (and enrollment_due_at while it may be put off).

export type SocialChallenge = {
  mfaToken: string;
  factors: LoginFactor[];
  enrollment: { dueAt?: string } | null;
};

const FACTOR_TYPES = new Set<LoginFactor["type"]>(["totp", "recovery_code", "email", "sms", "passkey", "push"]);

function isFactor(value: unknown): value is LoginFactor {
  if (!value || typeof value !== "object") return false;
  const f = value as Record<string, unknown>;
  return (
    FACTOR_TYPES.has(f.type as LoginFactor["type"]) &&
    (f.id === undefined || typeof f.id === "string") &&
    (f.destination === undefined || typeof f.destination === "string")
  );
}

function factorsOf(params: URLSearchParams): LoginFactor[] {
  try {
    const parsed: unknown = JSON.parse(params.get("factors") ?? "");
    if (Array.isArray(parsed)) return parsed.filter(isFactor);
  } catch {
    // Not sent, or unreadable: fall back to the methods below.
  }
  // Without the factor list, offer what needs no factor id.
  return (params.get("methods") ?? "")
    .split(",")
    .filter((m): m is LoginFactor["type"] => FACTOR_TYPES.has(m as LoginFactor["type"]) && m !== "email" && m !== "sms")
    .map((type) => ({ type }));
}

/** The challenge a URL fragment carries, or null when it carries none. */
export function readSocialChallenge(hash: string): SocialChallenge | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const mfaToken = params.get("mfa_token");
  if (!mfaToken) return null;
  return {
    mfaToken,
    factors: factorsOf(params),
    enrollment:
      params.get("enrollment_required") === "true"
        ? { dueAt: params.get("enrollment_due_at") ?? undefined }
        : null,
  };
}
