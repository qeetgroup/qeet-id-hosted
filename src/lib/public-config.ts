// Public, non-secret runtime configuration.
//
// The browser-facing API origin can be set per deployment at RUNTIME with
// PUBLIC_API_URL, so one container image serves any environment (the
// qeet-id-deploy test kit runs the same image for QA and UAT). The server reads
// it from process.env on each request; the browser receives it from
// /public-config.js (loaded before hydration by the root layout).
//
// NEXT_PUBLIC_API_URL — inlined at build time — remains the fallback, so the
// Vercel deployment keeps working unchanged without PUBLIC_API_URL.

declare global {
  interface Window {
    __QEET_PUBLIC_CONFIG__?: { apiUrl?: string };
  }
}

const DEFAULT_API_URL = "http://localhost:4001";

const trimSlash = (u: string) => u.replace(/\/+$/, "");

/** Base URL of the Qeet ID API (no trailing slash), for server and browser code. */
export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return trimSlash(process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL);
  }
  return trimSlash(
    window.__QEET_PUBLIC_CONFIG__?.apiUrl || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL,
  );
}
