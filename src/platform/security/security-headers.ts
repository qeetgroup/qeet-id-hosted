// Headers for every response, pages and assets alike, applied in next.config.ts. The
// per-request Content-Security-Policy is set in src/proxy.ts.
//
// Left out on purpose:
// - Strict-Transport-Security belongs to the TLS edge: Vercel sends it, and the test kit's
//   edge decides per environment.
// - Cross-Origin-Opener-Policy: an application may open sign-in in a popup and wait for its
//   callback page to message the opener; same-origin here would cut that link.
// - upgrade-insecure-requests (CSP): the test kit runs dev and staging over plain http.

export const SECURITY_HEADERS = [
  // Reset and magic-link tokens ride in this site's URLs; never send them on in a Referer.
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" }, // frame-ancestors 'none' for older browsers
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];
