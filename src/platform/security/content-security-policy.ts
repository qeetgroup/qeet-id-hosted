// The Content-Security-Policy for every page this app renders, set per request in
// src/proxy.ts. Scripts run only with the request's nonce, which Next.js puts on its own
// scripts and the root layout on its two inline ones; 'strict-dynamic' lets them load their
// chunks, so no script host needs allowing.

/** Returns a fresh nonce: 128 random bits, base64. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Returns the policy for a page whose scripts carry `nonce`. apiOrigin is where the browser
 * sends API calls; framesApps is set only for the signed-out page, which loads each
 * application's front-channel sign-out page in a hidden frame.
 */
export function contentSecurityPolicy({
  nonce,
  apiOrigin,
  framesApps = false,
  dev = false,
}: {
  nonce: string;
  apiOrigin: string;
  framesApps?: boolean;
  dev?: boolean;
}): string {
  return [
    "default-src 'self'",
    // 'self' is for browsers without 'strict-dynamic'; dev mode's React needs eval.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Style attributes from React (the tenant's brand colours) and the design system. Unlike
    // scripts, styles can't run code.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:", // tenant logos live on other hosts
    "font-src 'self' data:",
    // The browser calls the API itself; dev mode also opens the reload socket.
    `connect-src 'self' ${apiOrigin}${dev ? " ws: wss:" : ""}`,
    // Applications' sign-out pages; a browser still refuses http frames in an https page.
    framesApps ? "frame-src https: http:" : "frame-src 'none'",
    "frame-ancestors 'none'", // no site may frame sign-in or consent (clickjacking)
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
}
