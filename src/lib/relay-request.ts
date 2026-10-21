import { headers } from "next/headers";

import { relayHeadersFor } from "@/lib/relay";

// The relay headers for the request a server page is rendering. Server-only.
export async function relayHeaders(): Promise<Record<string, string>> {
  return relayHeadersFor((await headers()).get("x-forwarded-for"));
}
