import { type NextRequest, NextResponse } from "next/server";

import { getApiBaseUrl } from "@/platform/config/public-config";
import { contentSecurityPolicy, createNonce } from "@/platform/security/content-security-policy";

// Gives every page its Content-Security-Policy with a fresh nonce. Next.js reads the nonce
// from the request's policy for its own scripts; the root layout reads x-nonce for its two.
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const policy = contentSecurityPolicy({
    nonce,
    apiOrigin: new URL(getApiBaseUrl()).origin,
    framesApps: request.nextUrl.pathname === "/sign-out/done",
    dev: process.env.NODE_ENV === "development",
  });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: built assets, the health check and prefetches need no policy.
      source: "/((?!_next/static|_next/image|favicon.ico|healthz).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
