// The signed-in person, as GET /v1/me returns it to the hosted login session (one of the few
// routes that accept its cookie). Pages that act for the signed-in account show who it is.

import { apiGet } from "./client";

export type Account = { email: string; name?: string };

type Me = { email?: string; display_name?: string | null };

/** Who is signed in in this browser; null when no one is, or it can't be read. */
export async function fetchSignedInAccount(): Promise<Account | null> {
  try {
    const me = await apiGet<Me>("/v1/me");
    if (!me.email) return null;
    return { email: me.email, ...(me.display_name ? { name: me.display_name } : {}) };
  } catch {
    return null;
  }
}
