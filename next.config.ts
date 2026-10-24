import type { NextConfig } from "next";

import { SECURITY_HEADERS } from "./src/platform/security/security-headers";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the container image (Dockerfile). Vercel
  // ignores this and keeps using its own build output.
  output: "standalone",
  reactCompiler: true,
  transpilePackages: ["@qeetrix/ui"],
  // Security headers on every response (src/platform/security/security-headers.ts); the
  // per-page Content-Security-Policy comes from src/proxy.ts.
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // The pages' former paths, which qeet-id-server still redirects to and
  // already-sent reset and magic-link emails still carry. The query (return_to,
  // tokens, logout tickets) is passed through, and the browser keeps any URL
  // fragment (a social MFA challenge) across the hop. Temporary, so a rollback
  // doesn't leave browsers holding a cached redirect to a page that's gone.
  async redirects() {
    return [
      { source: "/login", destination: "/sign-in", permanent: false },
      { source: "/signup", destination: "/sign-up", permanent: false },
      { source: "/logout", destination: "/sign-out", permanent: false },
      { source: "/logged-out", destination: "/sign-out/done", permanent: false },
      { source: "/reset", destination: "/reset-password", permanent: false },
      { source: "/magic", destination: "/magic-link", permanent: false },
      { source: "/admin-portal", destination: "/enterprise-setup", permanent: false },
    ];
  },
};

export default nextConfig;
