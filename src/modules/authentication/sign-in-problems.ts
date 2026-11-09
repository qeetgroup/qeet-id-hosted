// What a sign-in page says when the server refuses: one answer per kind of refusal, in the
// mockups' words, each with what to do next. A wrong password and an unknown address get the same
// answer, so the page never tells whether an account exists.

import { ApiError } from "@/platform/api/client";
import { ADDRESS_NOT_ALLOWED, ADDRESS_NOT_ALLOWED_REDIRECT } from "@/platform/api/errors";

export type Problem =
  | { kind: "wrong" }
  | {
      kind:
        | "locked"
        | "inactive"
        | "network"
        | "provider"
        | "unverified"
        | "closed"
        | "passkey"
        | "passkeyUnsupported"
        | "generic";
    }
  // A refusal with no copy of its own: the server's message, which already says what to do.
  | { kind: "server"; message: string };

/** The problem behind a failed sign-in call. */
export function problemOf(err: unknown): Problem {
  if (!(err instanceof ApiError)) return { kind: "generic" };
  switch (err.code) {
    case "auth.invalid_credentials":
      return { kind: "wrong" };
    case "auth.account_locked":
      return { kind: "locked" };
    case "auth.account_inactive":
    case "auth.account_suspended":
      return { kind: "inactive" };
    case ADDRESS_NOT_ALLOWED:
      return { kind: "network" };
  }
  return err.message ? { kind: "server", message: err.message } : { kind: "generic" };
}

/** The problem a social sign-in came back with (?error= on /sign-in), if it is one. */
export function problemOfRedirect(code: string): Problem | null {
  switch (code) {
    case "":
      return null;
    case ADDRESS_NOT_ALLOWED_REDIRECT:
      return { kind: "network" };
    case "account_inactive":
      return { kind: "inactive" };
    case "account_unverified":
      return { kind: "unverified" };
    case "registration_closed":
      return { kind: "closed" };
    default:
      return { kind: "provider" };
  }
}
