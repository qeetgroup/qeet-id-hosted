// Password recovery from the hosted login: a reset link emailed for its /reset-password page, and
// the new password set with that link's one-time token.

import { backend } from "@/platform/api/backend";

/**
 * Emails a reset link when the address has an account; the answer is the same either way. The
 * link opens this site's reset page and continues at returnTo when the server keeps it (only its
 * own /oauth/authorize address).
 */
export async function requestPasswordReset(input: { email: string; returnTo: string }) {
  await backend.post("/v1/auth/forgot-password", {
    body: {
      email: input.email,
      app: "hosted_login",
      ...(input.returnTo ? { return_to: input.returnTo } : {}),
    },
  });
}

/** Sets the new password with the link's token; every other sign-in of the person then ends. */
export async function resetPassword(input: { token: string; password: string }) {
  await backend.post("/v1/auth/reset-password", {
    body: { token: input.token, new_password: input.password },
  });
}
