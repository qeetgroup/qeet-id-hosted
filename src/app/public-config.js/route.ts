import { getApiBaseUrl } from "@/lib/public-config";

// Serves the public runtime configuration to the browser as a tiny script the
// root layout loads before hydration (see src/lib/public-config.ts). Public
// values only — never put a secret here.
export const dynamic = "force-dynamic";

export function GET() {
  const config = JSON.stringify({ apiUrl: getApiBaseUrl() }).replace(/</g, "\\u003c");
  return new Response(`window.__QEET_PUBLIC_CONFIG__=${config};\n`, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
