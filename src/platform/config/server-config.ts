// The server's settings, checked once at startup (src/instrumentation.ts) so a malformed
// value stops the server naming the variable, instead of breaking pages one by one. Format
// only: the test kit runs some environments over plain http, so https is the deployment's
// choice, not a rule here.

const API_URLS = ["PUBLIC_API_URL", "NEXT_PUBLIC_API_URL"];

/** Returns one message per malformed setting; empty when every set value is usable. */
export function serverConfigProblems(env: Record<string, string | undefined>): string[] {
  const problems: string[] = [];
  for (const name of API_URLS) {
    const value = env[name];
    if (value && !isApiUrl(value)) {
      problems.push(`${name} must be an http(s) URL without credentials, query or fragment`);
    }
  }
  const hops = env.LOGIN_TRUSTED_PROXY_HOPS;
  if (hops && !/^\d+$/.test(hops)) {
    problems.push("LOGIN_TRUSTED_PROXY_HOPS must be a whole number");
  }
  // The API ignores a shorter key, so the relay would silently do nothing.
  const relayKey = env.QEET_ID_RELAY_KEY;
  if (relayKey && relayKey.length < 32) {
    problems.push("QEET_ID_RELAY_KEY must be at least 32 characters (openssl rand -base64 32)");
  }
  return problems;
}

function isApiUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      (u.protocol === "https:" || u.protocol === "http:") &&
      !u.username &&
      !u.password &&
      !u.search &&
      !u.hash
    );
  } catch {
    return false;
  }
}
