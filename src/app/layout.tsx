import { colorSchemeScript } from "@qeetrix/react/provider";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Providers } from "@/platform/components/providers";
import { publicConfigScript } from "@/platform/config/public-config";
import { THEME_STORAGE_KEY } from "@/platform/config/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sign in · Qeet ID", template: "%s · Qeet ID" },
  description: "Sign in to continue.",
  robots: { index: false, follow: false },
};

// The browser's own chrome on a phone takes the page's surface (Qeetrix surface.raised).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#191818" },
  ],
};

// Sets <html data-qx-color-scheme> from the saved choice before first paint, so neither theme
// flashes the other.
const themeScript = colorSchemeScript({ storageKey: THEME_STORAGE_KEY });

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Rendered per request: the config reads this deployment's PUBLIC_API_URL at runtime, and both
  // inline scripts carry the nonce src/proxy.ts put in this request's policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Qeetrix's fixed script, no input */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: server config, "<" escaped */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: publicConfigScript() }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
