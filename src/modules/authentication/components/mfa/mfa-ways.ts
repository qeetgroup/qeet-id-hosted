// The ways a sign-in's second step can be met, from the factors the server listed, and what the
// page says for each: which screen opens first, and its words.

import type { TFunction } from "i18next";

import type { LoginFactor } from "@/modules/authentication/api/session";
import { ApiError } from "@/platform/api/client";
import { PasskeyUnsupportedError } from "@/platform/webauthn/ceremony";

/** The screen the second step shows: a code (from the app, sent, or a recovery code), or a list. */
export type Mode =
  | { kind: "app" }
  | { kind: "sent"; factor: LoginFactor }
  | { kind: "recovery" }
  | { kind: "push" }
  | { kind: "ways" };

/** The ways the person set up, as the server listed them. */
export type Ways = {
  totp: boolean;
  recovery: boolean;
  push: boolean;
  passkey: boolean;
  /** Codes sent by email or text message, each to its own destination. */
  codes: LoginFactor[];
};

export function waysOf(factors: readonly LoginFactor[]): Ways {
  const has = (type: LoginFactor["type"]) => factors.some((f) => f.type === type);
  // An older server lists no factors: an authenticator app and recovery codes, then.
  const unlisted = factors.length === 0;
  return {
    totp: unlisted || has("totp"),
    recovery: unlisted || has("recovery_code"),
    push: has("push"),
    passkey: has("passkey"),
    codes: factors.filter((f) => (f.type === "email" || f.type === "sms") && f.id),
  };
}

/** The screen that opens first: the app's code, else the phone, else the list. */
export function firstMode(ways: Ways): Mode {
  if (ways.totp) return { kind: "app" };
  if (ways.push) return { kind: "push" };
  return { kind: "ways" };
}

/** What a code screen asks for. */
export function codeDescription(mode: Mode, t: TFunction<"signIn">): string {
  if (mode.kind === "recovery") return t("mfa.recoveryBody");
  if (mode.kind !== "sent") return t("mfa.appBody");
  const key = mode.factor.type === "sms" ? "mfa.textedBody" : "mfa.sentBody";
  return t(key, { destination: mode.factor.destination });
}

/** How long until a code can be sent again, in words. */
export function waitText(seconds: number, t: TFunction<"signIn">): string {
  if (seconds < 60) return t("mfa.wait.seconds", { count: seconds });
  return t("mfa.wait.minutes", { count: Math.ceil(seconds / 60) });
}

/** What the page says when a passkey couldn't meet the second step. */
export function passkeyError(err: unknown, t: TFunction<"signIn">): string {
  if (err instanceof PasskeyUnsupportedError) return t("problems.passkeyUnsupported.title");
  if (err instanceof ApiError) return err.message;
  return t("problems.passkey.title");
}
