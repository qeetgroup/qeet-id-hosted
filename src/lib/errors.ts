// Turning an API refusal into what a hosted-login page says. One place, so a
// refusal reads the same on every sign-in method.

import { ApiError } from "@/lib/api";

// The API's code when the organisation's address rules refuse the network the
// person is on, and the error the social callback sends the browser back with.
export const ADDRESS_NOT_ALLOWED = "auth.address_not_allowed";
export const ADDRESS_NOT_ALLOWED_REDIRECT = "address_not_allowed";

type Translate = (key: string) => string;

// isAddressRefusal reports an address-rule refusal. It names no rule, range or
// list, and nothing the person can retry from the same network.
export function isAddressRefusal(err: unknown): boolean {
  return err instanceof ApiError && err.code === ADDRESS_NOT_ALLOWED;
}

// apiErrorMessage is the message for a failed call: the shared network message
// for an address refusal, the API's own message for any other refusal, and
// fallback for anything else (a network failure, a cancelled ceremony).
export function apiErrorMessage(err: unknown, t: Translate, fallback: string): string {
  if (isAddressRefusal(err)) return t("common:errors.addressNotAllowed");
  if (err instanceof ApiError) return err.message;
  return fallback;
}
