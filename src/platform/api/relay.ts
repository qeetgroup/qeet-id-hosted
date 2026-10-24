// The hosted login's server fetches application details from the API for each
// visitor, so the API would see this server's address for everyone, and one
// shared per-address allowance would throttle all of them. A trusted relay may
// name the visitor's address (server QTID-828): with the key the API has in
// RELAY_KEYS (QEET_ID_RELAY_KEY here) it sends the address as X-Qeet-Client-IP.
// Without the key the API ignores the claim.
//
// Pure, so it is tested without Next.js; server pages call relayHeadersFor
// with the request's headers. The key never reaches the browser.

export const RELAY_KEY_HEADER = "X-Qeet-Relay-Key";
export const RELAY_CLIENT_IP_HEADER = "X-Qeet-Client-IP";

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
function isIP(value: string): boolean {
  if (IPV4.test(value)) return true;
  if (!value.includes(":") || /[[\]/@\s]/.test(value)) return false;
  try {
    return new URL(`http://[${value}]/`).hostname.length > 2;
  } catch {
    return false;
  }
}

/**
 * The visitor's address: behind LOGIN_TRUSTED_PROXY_HOPS proxies that append to
 * X-Forwarded-For, the entry left of the ones they appended (counted from the
 * right, so a forged leftmost entry is ignored). null when unknown: with no
 * trusted proxy there is no address to relay.
 */
export function visitorAddress(forwardedFor: string | null, hops: number): string | null {
  if (!forwardedFor || !Number.isFinite(hops) || hops < 1) return null;
  const parts = forwardedFor.split(",").map((p) => p.trim());
  const candidate = parts[parts.length - hops];
  return candidate && isIP(candidate) ? candidate : null;
}

/** The headers naming the visitor's address to the API, or none. */
export function relayHeadersFor(
  forwardedFor: string | null,
  env: Record<string, string | undefined> = process.env,
): Record<string, string> {
  const key = env.QEET_ID_RELAY_KEY;
  if (!key) return {};
  const address = visitorAddress(
    forwardedFor,
    Number.parseInt(env.LOGIN_TRUSTED_PROXY_HOPS ?? "0", 10),
  );
  if (!address) return {};
  return { [RELAY_KEY_HEADER]: key, [RELAY_CLIENT_IP_HEADER]: address };
}
