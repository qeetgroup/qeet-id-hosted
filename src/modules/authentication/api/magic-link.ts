// Sign-in links: one is emailed for the hosted login (app hosted_login), opened on its
// /magic-link page and traded there once for the session, then the journey goes on at return_to.

import { backend } from "@/platform/api/backend";
import type { Answer } from "@/platform/api/contract";

/**
 * Emails a sign-in link. Asked from an organisation's page, that organisation's rules apply; the
 * answer is the same whether or not the address has an account.
 */
export async function sendSignInLink(input: {
  email: string;
  organizationId: string;
  returnTo: string;
}) {
  await backend.post("/v1/auth/magic-link/start", {
    body: {
      email: input.email,
      app: "hosted_login",
      ...(input.organizationId ? { organization_id: input.organizationId } : {}),
      ...(input.returnTo ? { return_to: input.returnTo } : {}),
    },
  });
}

/** Trades a link's token for the session, or the second step to meet first. Spent either way. */
export function tradeSignInLink(
  token: string,
): Promise<Answer<"/v1/auth/magic-link/session", "post">> {
  return backend.post("/v1/auth/magic-link/session", { body: { token } });
}

/** Sends a new link to the address a used or expired one went to. */
export async function resendSignInLink(token: string) {
  await backend.post("/v1/auth/magic-link/resend", { body: { token } });
}
