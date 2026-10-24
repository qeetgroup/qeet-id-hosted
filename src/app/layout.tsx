// The provider's own entry, not the package root: this layout is a Server
// Component, and importing the root barrel here made every client component in
// @qeetrix/ui (charts, rich-text editor, …) a client reference shipped to every
// page — about 1.9 MB of JavaScript the hosted login never uses.
import { ThemeProvider } from "@qeetrix/ui/providers/theme-provider";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { I18nProvider } from "@/i18n/provider";
import { publicConfigScript } from "@/platform/config/public-config";
import { THEME_STORAGE_KEY } from "@/platform/config/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sign in — Qeet",
  description: "Sign in to continue.",
  robots: { index: false, follow: false },
};

// Set the theme class before first paint to avoid a flash of the wrong theme.
const themeBootstrap = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.classList.add(r);}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Rendered per request: the config reads this deployment's PUBLIC_API_URL at runtime,
  // and both inline scripts carry the nonce src/proxy.ts put in this request's policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant, no user input */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: server config, "<" escaped */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: publicConfigScript() }} />
      </head>
      <body className="bg-background text-foreground min-h-full font-sans">
        <ThemeProvider defaultTheme="system" storageKey={THEME_STORAGE_KEY}>
          <I18nProvider>
            {/* The per-screen <AuthShell> owns full-page layout (split-screen on
                ≥lg), so the root just provides a full-height canvas. */}
            <main className="min-h-dvh">{children}</main>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
