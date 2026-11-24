// Turning an API refusal into what a hosted-login page says. One place, so a
// refusal reads the same on every sign-in method.

import { ApiError } from "./client";

// The API's code when the organisation's address rules refuse the network the
// person is on, and the error the social callback sends the browser back with.
export const ADDRESS_NOT_ALLOWED = "auth.address_not_allowed";
export const ADDRESS_NOT_ALLOWED_REDIRECT = "address_not_allowed";

// The API's code when the address's domain belongs to an organisation that signs its people in
// through its own identity provider, and the error a refused social sign-in comes back with.
export const SSO_REQUIRED = "auth.sso_required";
export const SSO_REQUIRED_REDIRECT = "sso_required";

type Translate = (key: string) => string;

// isAddressRefusal reports an address-rule refusal. It names no rule, range or
// list, and nothing the person can retry from the same network.
export function isAddressRefusal(err: unknown): boolean {
  return err instanceof ApiError && err.code === ADDRESS_NOT_ALLOWED;
}

// isSsoRequired reports a way of signing in the address's organisation has replaced with its own
// sign-in. It depends only on the address's domain, never on whether the account exists.
export function isSsoRequired(err: unknown): boolean {
  return err instanceof ApiError && err.code === SSO_REQUIRED;
}

// apiErrorMessage is the message for a failed call: the shared network message
// for an address refusal, the API's own message for any other refusal, and
// fallback for anything else (a network failure, a cancelled ceremony).
export function apiErrorMessage(err: unknown, t: Translate, fallback: string): string {
  if (isAddressRefusal(err)) return t("common:errors.addressNotAllowed");
  if (err instanceof ApiError) return err.message;
  return fallback;
}

// isPasswordRefusal reports a new password the organisation's rules (or the breach check) refused.
// The server's message names the rule that failed, so a page shows it at the password field.
export function isPasswordRefusal(err: unknown): err is ApiError {
  return (
    err instanceof ApiError &&
    (err.code.startsWith("authpolicy.password_") ||
      err.code === "auth.password_weak" ||
      err.code === "auth.password_breached")
  );
}
